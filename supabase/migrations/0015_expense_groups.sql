-- ============================================
-- Mi Platica — Gastos compartidos (split de gastos) · Sprint 13
-- ============================================
-- Primer dominio MULTI-USUARIO de la app. Hasta ahora todo era owner_id =
-- auth.uid() (RLS owner-only). Acá los datos se comparten entre cuentas: un grupo
-- tiene miembros (cada uno = usuario real O "fantasma" sin cuenta), gastos con
-- splits y settlements. La seguridad pasa de "dueño" a "membresía".
--
-- Modelo híbrido de participantes:
--   - group_members.user_id NOT NULL  → miembro con cuenta Mi Platica.
--   - group_members.user_id NULL      → "fantasma" (solo nombre+email). Cuando esa
--                                        persona se registra/loguea con ese email,
--                                        claim_group_invites() lo vincula.
--
-- Monetización: la feature es Pro pero gratis limitada. Free = 1 grupo ACTIVO
-- creado por el usuario; Pro = ilimitados. Ser miembro de grupos ajenos es gratis.
-- El límite se enforce server-side en create_expense_group() (el cliente no decide).
--
-- ⚠️ RLS sin recursión: las policies de group_members consultan group_members vía
-- is_group_member()/is_group_owner(), que son SECURITY DEFINER → bypasean RLS y
-- evitan la autorreferencia infinita. Mantener esa propiedad.
-- ============================================

-- ============================================
-- 1. EXPENSE GROUPS
-- ============================================
create table public.expense_groups (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  kind             text not null default 'other'
                   check (kind in ('trip', 'household', 'outing', 'other')),
  default_currency text not null default 'ARS'
                   check (default_currency in ('ARS', 'USD')),
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.expense_groups (created_by) where not is_archived;

-- ============================================
-- 2. GROUP MEMBERS (usuario real o fantasma)
-- ============================================
create table public.group_members (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.expense_groups (id) on delete cascade,
  user_id          uuid references auth.users (id) on delete set null,  -- null = fantasma
  display_name     text not null,
  email            text,                                                -- para invitar/recordar
  role             text not null default 'member' check (role in ('owner', 'member')),
  status           text not null default 'invited' check (status in ('active', 'invited', 'left')),
  invite_token     uuid not null default gen_random_uuid(),             -- deep-link de invitación
  last_reminded_at timestamptz,                                         -- throttle del cron de mail
  joined_at        timestamptz,
  created_at       timestamptz not null default now()
);
create index on public.group_members (group_id);
create index on public.group_members (user_id) where user_id is not null;
-- Un usuario no se repite en un grupo; un email no se repite en un grupo.
create unique index group_members_user_uniq  on public.group_members (group_id, user_id)        where user_id is not null;
create unique index group_members_email_uniq on public.group_members (group_id, lower(email))    where email is not null;

-- ============================================
-- 3. SHARED EXPENSES
-- ============================================
create table public.shared_expenses (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.expense_groups (id) on delete cascade,
  paid_by       uuid not null references public.group_members (id) on delete restrict,
  amount_ars    numeric(18, 2) not null check (amount_ars > 0),
  amount_usd    numeric(18, 4),
  currency      text not null default 'ARS' check (currency in ('ARS', 'USD')),
  usd_rate_used numeric(18, 4),
  description   text not null,
  category      text,                              -- id de lib/categories.ts
  date          date not null default current_date,
  split_type    text not null default 'equal' check (split_type in ('equal', 'exact', 'shares', 'percent')),
  created_by    uuid not null references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.shared_expenses (group_id, date desc);

-- ============================================
-- 4. EXPENSE SPLITS (cuánto le toca a cada miembro)
-- ============================================
-- Suma de amount_ars de los splits de un gasto == amount_ars del gasto.
create table public.expense_splits (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.shared_expenses (id) on delete cascade,
  member_id  uuid not null references public.group_members (id) on delete cascade,
  amount_ars numeric(18, 2) not null check (amount_ars >= 0),
  share      numeric(18, 4),                       -- peso/porcentaje crudo (para editar)
  unique (expense_id, member_id)
);
create index on public.expense_splits (expense_id);

-- ============================================
-- 5. SETTLEMENTS ("X le pagó $N a Y")
-- ============================================
create table public.settlements (
  id                     uuid primary key default gen_random_uuid(),
  group_id               uuid not null references public.expense_groups (id) on delete cascade,
  from_member            uuid not null references public.group_members (id) on delete restrict,
  to_member              uuid not null references public.group_members (id) on delete restrict,
  amount_ars             numeric(18, 2) not null check (amount_ars > 0),
  currency               text not null default 'ARS' check (currency in ('ARS', 'USD')),
  date                   date not null default current_date,
  note                   text,
  -- Puente OPCIONAL con el ledger personal: si el usuario tildó "registrar como
  -- movimiento", apunta a la transacción creada en sus cuentas. Null = no registrado.
  recorded_transaction_id uuid references public.transactions (id) on delete set null,
  created_by             uuid not null references auth.users (id) on delete set null,
  created_at             timestamptz not null default now()
);
create index on public.settlements (group_id);

-- ============================================
-- updated_at trigger (reusa public.set_updated_at de 0001)
-- ============================================
create trigger trg_expense_groups_updated_at
  before update on public.expense_groups
  for each row execute function public.set_updated_at();

-- ============================================
-- HELPERS DE MEMBRESÍA (security definer → bypasean RLS, sin recursión)
-- ============================================
create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

comment on function public.is_group_member(uuid) is 'True si el usuario autenticado es miembro activo del grupo. SECURITY DEFINER para evitar recursión de RLS.';

create or replace function public.is_group_owner(p_group uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'owner'
  );
$$;

comment on function public.is_group_owner(uuid) is 'True si el usuario autenticado es owner activo del grupo.';

-- ============================================
-- create_expense_group() — alta atómica + ENFORCE del límite Free
-- ============================================
-- Crea el grupo y agrega al creador como owner activo en una sola transacción.
-- Si el usuario NO es Pro y ya tiene >=1 grupo activo creado por él, lanza
-- excepción 'group_limit_reached' (el cliente la atrapa → paywall). Falla cerrado.
create or replace function public.create_expense_group(
  p_name     text,
  p_kind     text default 'other',
  p_currency text default 'ARS'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_group uuid;
  v_count integer;
  v_name  text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'name_required' using errcode = '22023';
  end if;

  if not public.is_pro() then
    select count(*) into v_count
      from public.expense_groups g
      where g.created_by = v_uid and not g.is_archived;
    if v_count >= 1 then
      raise exception 'group_limit_reached' using errcode = 'P0001';
    end if;
  end if;

  insert into public.expense_groups (created_by, name, kind, default_currency)
    values (v_uid, v_name, coalesce(p_kind, 'other'), coalesce(p_currency, 'ARS'))
    returning id into v_group;

  -- El creador es owner activo. display_name desde el profile (fallback al email local).
  insert into public.group_members (group_id, user_id, display_name, email, role, status, joined_at)
    select v_group, v_uid,
           coalesce(nullif(p.name, ''), split_part(u.email, '@', 1), 'Yo'),
           u.email, 'owner', 'active', now()
      from auth.users u
      left join public.profiles p on p.id = u.id
      where u.id = v_uid;

  return v_group;
end;
$$;

comment on function public.create_expense_group(text, text, text) is 'Crea un grupo + suma al creador como owner. Enforce límite Free (1 grupo activo si no es Pro).';

-- ============================================
-- claim_group_invites() — vincula fantasmas al loguearse
-- ============================================
-- Busca group_members fantasma (user_id null) cuyo email coincide con el del
-- usuario autenticado y los vincula. Devuelve cuántos reclamó. El cliente la
-- llama tras el login (cubre usuarios que ya existían antes de ser invitados).
create or replace function public.claim_group_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_n     integer;
begin
  if v_uid is null then
    return 0;
  end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    return 0;
  end if;

  with claimed as (
    update public.group_members m
      set user_id   = v_uid,
          status    = 'active',
          joined_at = coalesce(m.joined_at, now())
      where m.user_id is null
        and m.email is not null
        and lower(m.email) = lower(v_email)
        -- Evita chocar con una fila ya vinculada del mismo usuario en ese grupo.
        and not exists (
          select 1 from public.group_members x
          where x.group_id = m.group_id and x.user_id = v_uid
        )
      returning 1
  )
  select count(*) into v_n from claimed;
  return v_n;
end;
$$;

comment on function public.claim_group_invites() is 'Vincula los miembros fantasma cuyo email coincide con el del usuario autenticado.';

-- ============================================
-- my_group_balances() — saldo neto del usuario por grupo (para la lista)
-- ============================================
-- Devuelve (group_id, net) del usuario autenticado en cada grupo donde participa.
-- net > 0: le deben; < 0: debe. Un solo round-trip → evita N+1 en la lista.
create or replace function public.my_group_balances()
returns table (group_id uuid, net numeric)
language sql
security definer
set search_path = public
as $$
  with my as (
    select m.id as member_id, m.group_id
      from public.group_members m
      where m.user_id = auth.uid() and m.status = 'active'
  ),
  paid as (
    select e.group_id, sum(e.amount_ars) amt
      from public.shared_expenses e join my on my.member_id = e.paid_by
      group by e.group_id
  ),
  owed as (
    select e.group_id, sum(s.amount_ars) amt
      from public.expense_splits s
      join my on my.member_id = s.member_id
      join public.shared_expenses e on e.id = s.expense_id
      group by e.group_id
  ),
  paid_settle as (   -- yo pagué (from) → reduce mi deuda (+)
    select st.group_id, sum(st.amount_ars) amt
      from public.settlements st join my on my.member_id = st.from_member
      group by st.group_id
  ),
  recv_settle as (   -- me pagaron (to) → (−)
    select st.group_id, sum(st.amount_ars) amt
      from public.settlements st join my on my.member_id = st.to_member
      group by st.group_id
  )
  select my.group_id,
         coalesce(paid.amt, 0) - coalesce(owed.amt, 0)
           + coalesce(paid_settle.amt, 0) - coalesce(recv_settle.amt, 0) as net
    from my
    left join paid        on paid.group_id        = my.group_id
    left join owed        on owed.group_id        = my.group_id
    left join paid_settle on paid_settle.group_id = my.group_id
    left join recv_settle on recv_settle.group_id = my.group_id;
$$;

comment on function public.my_group_balances() is 'Saldo neto del usuario autenticado por grupo (>0 le deben, <0 debe).';

-- ============================================
-- handle_new_user — extendido para reclamar invitaciones al signup
-- ============================================
-- Reemplaza la función de 0001: además de crear el profile, vincula cualquier
-- group_member fantasma con el email del nuevo usuario.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));

  if new.email is not null then
    update public.group_members m
      set user_id   = new.id,
          status    = 'active',
          joined_at = coalesce(m.joined_at, now())
      where m.user_id is null
        and m.email is not null
        and lower(m.email) = lower(new.email);
  end if;

  return new;
end;
$$;

-- ============================================
-- RLS — Habilitación
-- ============================================
alter table public.expense_groups  enable row level security;
alter table public.group_members   enable row level security;
alter table public.shared_expenses enable row level security;
alter table public.expense_splits  enable row level security;
alter table public.settlements     enable row level security;

-- ── expense_groups ───────────────────────────────────────────────────────────
-- INSERT: sin policy para `authenticated` → forzamos el alta vía create_expense_group()
-- (security definer) para que el límite Free no se pueda saltear con un insert directo.
create policy "groups: member read"  on public.expense_groups
  for select using (public.is_group_member(id) or created_by = auth.uid());
create policy "groups: owner update" on public.expense_groups
  for update using (public.is_group_owner(id)) with check (public.is_group_owner(id));
create policy "groups: owner delete" on public.expense_groups
  for delete using (public.is_group_owner(id));

-- ── group_members ────────────────────────────────────────────────────────────
create policy "members: read in my groups" on public.group_members
  for select using (public.is_group_member(group_id) or user_id = auth.uid());
-- Cualquier miembro activo puede invitar (insertar miembros). No puede crear otro owner.
create policy "members: member invites" on public.group_members
  for insert with check (public.is_group_member(group_id) and role = 'member');
-- El owner gestiona a todos; cada uno puede actualizar/borrar su propia fila (salir).
create policy "members: owner or self update" on public.group_members
  for update using (public.is_group_owner(group_id) or user_id = auth.uid())
            with check (public.is_group_owner(group_id) or user_id = auth.uid());
create policy "members: owner or self delete" on public.group_members
  for delete using (public.is_group_owner(group_id) or user_id = auth.uid());

-- ── shared_expenses ──────────────────────────────────────────────────────────
create policy "expenses: members all" on public.shared_expenses
  for all using (public.is_group_member(group_id))
          with check (public.is_group_member(group_id) and created_by = auth.uid());

-- ── expense_splits (vía join al gasto) ───────────────────────────────────────
create policy "splits: members all" on public.expense_splits
  for all using (exists (
            select 1 from public.shared_expenses e
            where e.id = expense_id and public.is_group_member(e.group_id)))
          with check (exists (
            select 1 from public.shared_expenses e
            where e.id = expense_id and public.is_group_member(e.group_id)));

-- ── settlements ──────────────────────────────────────────────────────────────
create policy "settlements: members all" on public.settlements
  for all using (public.is_group_member(group_id))
          with check (public.is_group_member(group_id) and created_by = auth.uid());
