-- ============================================
-- Mi Platica — pg_cron para split-reminders-cron (Sprint 13: gastos compartidos)
-- ============================================
-- Recordatorio diario por mail a los deudores con saldo pendiente en cada grupo.
-- La edge (verify_jwt=false) tiene throttle propio (no recuerda al mismo deudor
-- más de 1 vez cada 6 días), así que correr a diario es idempotente.
--
-- 12:00 UTC ≈ 09:00 AR. Keyless (sin anon key), igual que los otros crons.
-- ============================================

select cron.unschedule('split-reminders-cron')
where exists (select 1 from cron.job where jobname = 'split-reminders-cron');

select cron.schedule(
  'split-reminders-cron',
  '0 12 * * *',
  $job$
  select net.http_post(
    url     := 'https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/split-reminders-cron',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);
