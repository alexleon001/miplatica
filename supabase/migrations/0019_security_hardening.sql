-- 0019_security_hardening.sql
-- Cierra los WARNs del Supabase security advisor (2026-07-16):
--   * SECURITY DEFINER functions ejecutables por `anon` (sin login) vía PostgREST RPC.
--   * `set_updated_at` sin search_path fijo.
--
-- Criterio de revocación (verificado contra el código en lib/ y supabase/functions/):
--   - Funciones internas (triggers / helpers / llamadas solo con service role):
--     revocar de PUBLIC, anon y authenticated. Los triggers no se ven afectados
--     (corren como el owner de la tabla, no vía EXECUTE del rol del request).
--   - Funciones que el cliente logueado o las edges con JWT de usuario sí llaman:
--     revocar solo de PUBLIC y anon; `authenticated` las conserva.
--
-- NO tocado a propósito:
--   - `grant_ai_reward_credit_for(uuid)` — vive en 0014, aún NO aplicada.
--   - Extensión pg_net en schema public — los crons keyless dependen de
--     `net.http_post`; moverla requiere recrear los cron jobs (otro cambio).
--   - Leaked password protection — es un toggle de Auth en el dashboard, no SQL.

-- ── Internas: nadie las llama por RPC ──────────────────────────────────────
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.refresh_positions() from public, anon, authenticated; -- solo edge update-asset-prices (service role)
revoke execute on function public.recompute_budget(uuid, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.sync_budget_spent() from public, anon, authenticated;
revoke execute on function public.init_budget_spent() from public, anon, authenticated;

-- ── De usuario: requieren sesión; se les corta solo el acceso anónimo ──────
revoke execute on function public.is_pro() from public, anon;
revoke execute on function public.consume_ai_quota(integer) from public, anon;
revoke execute on function public.consume_ai_reward_credit() from public, anon;
revoke execute on function public.grant_ai_reward_credit() from public, anon;
revoke execute on function public.create_expense_group(text, text, text) from public, anon;
revoke execute on function public.claim_group_invites() from public, anon;
revoke execute on function public.my_group_balances() from public, anon;
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.is_group_owner(uuid) from public, anon;

-- ── search_path fijo en el trigger que faltaba ─────────────────────────────
alter function public.set_updated_at() set search_path = public;
