-- ============================================
-- Mi Platica — Índice de inflación (IPC mensual) (Sprint 3.5, regla #5)
-- ============================================
-- Tabla global de referencia con la inflación mensual argentina (IPC INDEC),
-- usada para mostrar rendimiento REAL (ajustado por inflación) en P&L.
-- Fuente: https://api.argentinadatos.com/v1/finanzas/indices/inflacion
--   shape: [{ "fecha": "YYYY-MM-DD" (fin de mes), "valor": <% mensual> }, ...]
--
-- Igual que exchange_rates / asset_prices: dato global sin owner →
-- RLS lectura pública, escritura solo service_role (Edge fetch-inflation).
--
-- `month` se normaliza al PRIMER día del mes (date_trunc) como PK, para que el
-- cálculo de inflación acumulada entre dos fechas matchee mes a mes sin
-- ambigüedad de fin/inicio de mes.
-- ============================================

create table public.inflation (
  month      date primary key,        -- primer día del mes (2026-04-01)
  ipc        numeric(8, 4) not null,  -- inflación mensual en % (ej: 2.6)
  fetched_at timestamptz not null default now()
);

comment on table public.inflation is 'IPC mensual argentino (INDEC vía argentinadatos). month = primer día del mes.';

alter table public.inflation enable row level security;

-- Dato global: lectura pública (cualquier usuario autenticado), escritura solo service_role.
create policy "inflation: read all" on public.inflation for select using (true);

-- ── cron: fetch-inflation ────────────────────────────────────────────────
-- El IPC sale ~mediados del mes siguiente. Corremos un par de veces al mes
-- (la Edge upserta toda la serie, es idempotente). Días 4 y 17, 14:00 UTC.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('fetch-inflation')
where exists (select 1 from cron.job where jobname = 'fetch-inflation');

select cron.schedule(
  'fetch-inflation',
  '0 14 4,17 * *',
  $job$
  select net.http_post(
    url     := 'https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/fetch-inflation',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
