-- ============================================
-- Mi Platica — pg_cron para mp-sync-cron (Sprint 5)
-- ============================================
-- Sincroniza saldo + pagos de Mercado Pago de TODAS las conexiones cada 6 h.
-- La edge (verify_jwt=false) saltea conexiones sincronizadas hace < 30 min, así
-- que es idempotente y no martilla la API de MP aunque corra seguido o el user
-- haya hecho un sync manual recién.
--
-- Keyless (sin anon key en el comando), igual que update-asset-prices /
-- fetch-exchange-rates. Reprogramable.
-- ============================================

select cron.unschedule('mp-sync-cron')
where exists (select 1 from cron.job where jobname = 'mp-sync-cron');

select cron.schedule(
  'mp-sync-cron',
  '0 */6 * * *',
  $job$
  select net.http_post(
    url     := 'https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/mp-sync-cron',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);
