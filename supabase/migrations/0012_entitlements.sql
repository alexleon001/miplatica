-- ============================================
-- Mi Platica — Entitlements Pro + cuota de IA (Sprint 10: monetización)
-- ============================================
-- Modelo freemium: la IA es Pro. Esta migración crea el sustrato server-side para
-- (a) saber si un usuario es Pro y (b) limitar el uso diario de IA (anti-abuso de
-- costo de Anthropic). La fuente de verdad del entitlement la escribe el webhook de
-- RevenueCat con service_role (Fase 2); acá solo se define la tabla + funciones.
--
-- Regla de oro: el cliente NUNCA decide si es Pro. Las Edge Functions de IA llaman
-- a is_pro() / consume_ai_quota() antes de gastar tokens.
-- ============================================

-- ── entitlements ─────────────────────────────────────────────────────────────
-- Una fila por usuario. is_pro + vencimiento (null = sin vencimiento conocido).
create table public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  is_pro     boolean not null default false,
  product_id text,                 -- id del producto en la store (ej "pro_annual")
  store      text,                 -- "play" | "app_store" | "promo" | "manual"
  expires_at timestamptz,          -- null = perpetuo / sin dato; si pasó → no Pro
  updated_at timestamptz not null default now()
);

comment on table public.entitlements is 'Entitlement Pro por usuario (lo escribe el webhook de RevenueCat con service_role).';

alter table public.entitlements enable row level security;

-- El usuario puede LEER su propio entitlement (para reflejarlo en la UI). La
-- escritura queda solo para service_role (sin policy de insert/update/delete).
create policy "entitlements: owner read" on public.entitlements
  for select using (auth.uid() = user_id);

-- ── is_pro() ───────────────────────────────────────────────────────────────
-- Devuelve true si el usuario que llama tiene Pro activo (no vencido). security
-- definer para que funcione aunque más adelante se endurezca el RLS de la tabla.
create or replace function public.is_pro()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = auth.uid()
      and e.is_pro
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

comment on function public.is_pro() is 'True si el usuario autenticado tiene entitlement Pro activo.';

-- ── cuota diaria de IA ───────────────────────────────────────────────────────
-- Contador por usuario por día (UTC). Backstop de costo: aun siendo Pro, se topea
-- la cantidad de llamadas de IA por día para evitar abuso/runaway.
create table public.ai_usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  count   integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage_daily enable row level security;

create policy "ai_usage: owner read" on public.ai_usage_daily
  for select using (auth.uid() = user_id);

-- Incrementa el contador del día del usuario y devuelve true si quedó DENTRO del
-- límite (<= p_limit). security definer: la escritura la hace la función, no el
-- usuario (no hay policy de insert/update para el rol authenticated).
create or replace function public.consume_ai_quota(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    return false;
  end if;
  insert into public.ai_usage_daily (user_id, day, count)
    values (v_uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
    do update set count = ai_usage_daily.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

comment on function public.consume_ai_quota(integer) is 'Suma 1 al uso diario de IA del usuario y devuelve true si quedó dentro del límite.';
