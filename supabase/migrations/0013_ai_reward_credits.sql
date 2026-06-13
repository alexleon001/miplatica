-- ============================================
-- Mi Platica — Créditos de IA por rewarded ads (Sprint 10: monetización)
-- ============================================
-- Puente Free→Pro: mirar un anuncio rewarded otorga 1 crédito de IA. El flujo:
-- el cliente, tras EARNED_REWARD de AdMob, llama a grant_ai_reward_credit();
-- el portón de IA (_shared/ai-gate.ts), cuando el usuario NO es Pro, intenta
-- consume_ai_reward_credit() antes de devolver 402.
--
-- Anti-abuso: tope de 3 grants por día (UTC) y máximo 3 créditos acumulados.
-- Sin verificación server-side (SSV) de AdMob por ahora: un cliente malicioso
-- podría otorgarse créditos sin mirar el anuncio, pero el costo queda topeado a
-- 3 llamadas de IA por usuario por día (centavos). Endurecer con SSV si escala.
-- La cuota diaria general (consume_ai_quota) aplica igual después del crédito.
-- ============================================

-- ── ai_reward_credits ────────────────────────────────────────────────────────
-- Una fila por usuario. Los créditos no vencen (el tope de acumulación los acota).
create table public.ai_reward_credits (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  credits       integer not null default 0,  -- créditos disponibles (máx 3)
  granted_on    date,                        -- día UTC del último grant (resetea el tope diario)
  granted_today integer not null default 0,
  updated_at    timestamptz not null default now()
);

comment on table public.ai_reward_credits is 'Créditos de IA ganados con rewarded ads (escritura solo vía funciones security definer).';

alter table public.ai_reward_credits enable row level security;

-- El usuario puede LEER sus créditos (para mostrarlos en la UI). La escritura
-- queda solo en las funciones (sin policy de insert/update/delete).
create policy "ai_reward_credits: owner read" on public.ai_reward_credits
  for select using (auth.uid() = user_id);

-- ── grant_ai_reward_credit() ─────────────────────────────────────────────────
-- Suma 1 crédito al usuario autenticado. Devuelve true si lo otorgó; false si
-- ya llegó al tope diario (3) o al tope de acumulación (3).
create or replace function public.grant_ai_reward_credit()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_cap constant integer := 3;
begin
  if v_uid is null then
    return false;
  end if;
  insert into public.ai_reward_credits (user_id, credits, granted_on, granted_today)
    values (v_uid, 1, v_today, 1)
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

comment on function public.grant_ai_reward_credit() is 'Otorga 1 crédito de IA por rewarded ad (tope 3/día y 3 acumulados). True si otorgó.';

-- ── consume_ai_reward_credit() ───────────────────────────────────────────────
-- Consume 1 crédito del usuario autenticado. True si había crédito para usar.
-- La llama el portón de IA cuando el usuario no es Pro.
create or replace function public.consume_ai_reward_credit()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;
  update public.ai_reward_credits
    set credits = credits - 1, updated_at = now()
    where user_id = v_uid and credits > 0;
  return found;
end;
$$;

comment on function public.consume_ai_reward_credit() is 'Consume 1 crédito de IA ganado por rewarded ad. True si había crédito.';
