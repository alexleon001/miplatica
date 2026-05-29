-- ============================================
-- Mi Platica — Mercado Pago OAuth (Sprint 4)
-- ============================================
-- Conexión OAuth 2.0 (Authorization Code) por usuario para sincronizar los
-- pagos recibidos en Mercado Pago hacia `transactions`.
--
-- Seguridad:
--   - Tokens encriptados con pgcrypto (regla #3): pgp_sym_encrypt. La clave NO
--     se guarda en la DB; viaja como parámetro desde un secret de la Edge
--     Function (MP_TOKEN_KEY) hacia funciones security definer.
--   - Las funciones de tokens se revocan a public/anon/authenticated → solo
--     service_role (las Edge Functions) puede cifrar/descifrar.
--   - `mp_oauth_states` asocia el callback (que llega sin JWT) al usuario que
--     inició el flujo + sirve de anti-CSRF (state de un solo uso, efímero).
-- ============================================

create extension if not exists pgcrypto;

-- ── Conexión por usuario (tokens cifrados) ──────────────────────────────
create table public.mp_connections (
  owner_id          uuid primary key references auth.users(id) on delete cascade,
  mp_user_id        text,
  access_token_enc  bytea not null,
  refresh_token_enc bytea,
  scope             text,
  expires_at        timestamptz,
  last_synced_at    timestamptz,
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── State efímero del flujo OAuth ───────────────────────────────────────
create table public.mp_oauth_states (
  state      text primary key,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.mp_connections enable row level security;
alter table public.mp_oauth_states enable row level security;

-- El usuario ve/borra su propia conexión (el contenido es bytea cifrado).
create policy "mp_conn: owner read"   on public.mp_connections for select using (owner_id = auth.uid());
create policy "mp_conn: owner delete" on public.mp_connections for delete using (owner_id = auth.uid());
-- mp-oauth-start corre con el JWT del user → necesita insertar su propio state.
create policy "mp_states: owner all"  on public.mp_oauth_states for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Las escrituras de tokens las hace service_role (Edge), que bypassea RLS.

-- ── Funciones pgcrypto (la key llega por parámetro desde Edge secrets) ───
create or replace function public.mp_store_connection(
  p_owner uuid, p_mp_user text, p_access text, p_refresh text,
  p_scope text, p_expires timestamptz, p_key text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.mp_connections
    (owner_id, mp_user_id, access_token_enc, refresh_token_enc, scope, expires_at, updated_at)
  values (
    p_owner, p_mp_user,
    pgp_sym_encrypt(p_access, p_key),
    case when p_refresh is null then null else pgp_sym_encrypt(p_refresh, p_key) end,
    p_scope, p_expires, now()
  )
  on conflict (owner_id) do update set
    mp_user_id        = excluded.mp_user_id,
    access_token_enc  = excluded.access_token_enc,
    -- si el refresh no vino en este intercambio, conservamos el anterior
    refresh_token_enc = coalesce(excluded.refresh_token_enc, public.mp_connections.refresh_token_enc),
    scope             = excluded.scope,
    expires_at        = excluded.expires_at,
    updated_at        = now();
$$;

create or replace function public.mp_get_tokens(p_owner uuid, p_key text)
returns table (access_token text, refresh_token text, expires_at timestamptz, mp_user_id text)
language sql
security definer
set search_path = public
as $$
  select
    pgp_sym_decrypt(access_token_enc, p_key),
    case when refresh_token_enc is null then null else pgp_sym_decrypt(refresh_token_enc, p_key) end,
    expires_at,
    mp_user_id
  from public.mp_connections
  where owner_id = p_owner;
$$;

-- Solo service_role (Edge) puede cifrar/descifrar tokens.
revoke all on function public.mp_store_connection(uuid, text, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.mp_get_tokens(uuid, text) from public, anon, authenticated;
