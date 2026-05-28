-- ============================================
-- Mi Platica — pg_cron para las Edge Functions de cotizaciones (Sprint 3)
-- ============================================
-- Agenda dos jobs que invocan las Edge Functions vía pg_net (HTTP async).
-- Ambas funciones son verify_jwt=false → se llaman keyless (sin anon key en el
-- comando del cron, así no queda ningún secreto en este archivo / en cron.job).
--
--   update-asset-prices  : cada 15 min, lun-vie 14:00–20:45 UTC (= 11:00–17:45
--                          ART, horario bursátil BYMA). Upsert de precios +
--                          refresh_positions() por RPC.
--   fetch-exchange-rates : cada 30 min, todos los días (las tasas blue/MEP se
--                          mueven todo el día). Upsert en exchange_rates.
--
-- Reprogramable: si el job ya existe, lo des-agenda antes de recrearlo.
-- ============================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── update-asset-prices ─────────────────────────────────────────────────
select cron.unschedule('update-asset-prices')
where exists (select 1 from cron.job where jobname = 'update-asset-prices');

select cron.schedule(
  'update-asset-prices',
  '*/15 14-20 * * 1-5',
  $job$
  select net.http_post(
    url     := 'https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/update-asset-prices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);

-- ── fetch-exchange-rates ────────────────────────────────────────────────
select cron.unschedule('fetch-exchange-rates')
where exists (select 1 from cron.job where jobname = 'fetch-exchange-rates');

select cron.schedule(
  'fetch-exchange-rates',
  '*/30 * * * *',
  $job$
  select net.http_post(
    url     := 'https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/fetch-exchange-rates',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
