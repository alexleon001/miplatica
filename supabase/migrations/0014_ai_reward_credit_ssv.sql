-- ============================================
-- Mi Platica — SSV de rewarded ads (Sprint 10: monetización, hardening)
-- ============================================
-- Endurece el puente Free→Pro contra spoofing. Hoy el cliente, tras EARNED_REWARD,
-- llama grant_ai_reward_credit() directo: un cliente malicioso puede otorgarse
-- créditos sin mirar el anuncio (costo topeado a 3/día = centavos, ver 0013).
--
-- Con SSV (Server-Side Verification de AdMob) el crédito lo otorga el SERVER de
-- Google: cuando el usuario gana la recompensa, AdMob llama por GET a la Edge
-- Function `rewarded-ssv` con los parámetros FIRMADOS. La edge verifica la firma
-- ECDSA y recién ahí otorga el crédito al user_id que el cliente pasó como SSV
-- userId. Esa edge corre con service_role (NO está autenticada como el usuario:
-- la llama Google), así que necesita otorgar a un user_id explícito.
--
-- ⚠️ INACTIVO hasta activar SSV (ver CLAUDE.md): requiere un rewarded unit REAL
-- en AdMob + configurar la URL de la edge como SSV callback + que el cliente pase
-- userId. NO se puede con test units (no son tuyos). Esta función queda lista.
-- ============================================

-- ── grant_ai_reward_credit_for(uuid) ────────────────────────────────────────
-- Igual que grant_ai_reward_credit() pero a un user_id explícito. Misma lógica de
-- tope (3/día UTC, 3 acumulados). Solo service_role: revocada de anon/authenticated.
create or replace function public.grant_ai_reward_credit_for(p_uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_cap constant integer := 3;
begin
  if p_uid is null then
    return false;
  end if;
  insert into public.ai_reward_credits (user_id, credits, granted_on, granted_today)
    values (p_uid, 1, v_today, 1)
  on conflict (user_id) do update
    set credits       = least(ai_reward_credits.credits + 1, v_cap),
        granted_today = case when ai_reward_credits.granted_on = v_today
                             then ai_reward_credits.granted_today + 1 else 1 end,
        granted_on    = v_today,
        updated_at    = now()
    where ai_reward_credits.credits < v_cap
      and (ai_reward_credits.granted_on is distinct from v_today
           or ai_reward_credits.granted_today < v_cap);
  return found;
end;
$$;

-- Solo service_role (la edge SSV). Que un cliente no pueda otorgarse a sí mismo
-- saltándose el anuncio por esta vía.
revoke all on function public.grant_ai_reward_credit_for(uuid) from public;
revoke all on function public.grant_ai_reward_credit_for(uuid) from anon, authenticated;

comment on function public.grant_ai_reward_credit_for(uuid) is 'SSV-only: otorga 1 crédito de IA a un user_id (tope 3/día y 3 acumulados). Llamar solo con service_role desde la edge rewarded-ssv.';
