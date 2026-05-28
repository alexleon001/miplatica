-- ============================================
-- Mi Platica — refresh_positions() (Sprint 3, paso 7)
-- ============================================
-- Revaloriza TODAS las posiciones de investments con las últimas cotizaciones
-- (asset_prices) + la tasa MEP más reciente (exchange_rates). Es el espejo en
-- SQL de lib/instruments.ts::deriveInvestmentValues, pensado para correr después
-- de update-asset-prices (la Edge Function la llama por RPC; también puede
-- agendarse en pg_cron).
--
-- security definer + revoke public: solo service_role la ejecuta (el cron / la
-- Edge Function). No toma parámetros y solo recalcula campos derivados a partir
-- de datos ya existentes + precios públicos → sin riesgo de fuga ni inyección.
--
-- Devuelve la cantidad de filas actualizadas (suma de los 3 updates).
-- ============================================

create or replace function public.refresh_positions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mep   numeric;
  v_today date := current_date;
  v_count integer := 0;
  v_n     integer;
begin
  select mep into v_mep
  from public.exchange_rates
  order by date desc
  limit 1;

  -- ── 1. Instrumentos de mercado (matchean ticker en asset_prices) ────────
  with calc as (
    select
      inv.id,
      inv.currency,
      inv.quantity,
      (case when inv.currency = 'ARS' then ap.price_ars else ap.price_usd end)         as price_native,
      (case when inv.currency = 'ARS' then inv.avg_cost_ars else inv.avg_cost_usd end)  as cost_native
    from public.investments inv
    join public.asset_prices ap on ap.ticker = upper(inv.ticker)
    where inv.type in ('fci', 'cedear', 'accion', 'on', 'bono', 'lecap', 'crypto')
      and inv.ticker is not null
  ),
  final as (
    select
      id, currency, quantity, price_native, cost_native,
      quantity * price_native            as value_native,
      quantity * coalesce(cost_native, 0) as cost_total_native
    from calc
    where price_native is not null
  )
  update public.investments inv set
    current_price_ars = round((case when f.currency = 'ARS' then f.price_native
                                    when v_mep > 0 then f.price_native * v_mep end)::numeric, 4),
    current_price_usd = round((case when f.currency = 'USD' then f.price_native
                                    when v_mep > 0 then f.price_native / v_mep end)::numeric, 4),
    current_value_ars = round((case when f.currency = 'ARS' then f.value_native
                                    when v_mep > 0 then f.value_native * v_mep end)::numeric, 2),
    current_value_usd = round((case when f.currency = 'USD' then f.value_native
                                    when v_mep > 0 then f.value_native / v_mep end)::numeric, 2),
    profit_loss_ars   = round((case when f.currency = 'ARS' then f.value_native - f.cost_total_native
                                    when v_mep > 0 then (f.value_native - f.cost_total_native) * v_mep end)::numeric, 2),
    profit_loss_usd   = round((case when f.currency = 'USD' then f.value_native - f.cost_total_native
                                    when v_mep > 0 then (f.value_native - f.cost_total_native) / v_mep end)::numeric, 2),
    profit_loss_pct   = case when f.cost_total_native > 0
                             then round(((f.value_native - f.cost_total_native) / f.cost_total_native * 100)::numeric, 4)
                             else 0 end,
    last_updated = now()
  from final f
  where inv.id = f.id;

  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  -- ── 2. Dólar MEP / billete: valor en USD al par; rendimiento real en ARS ─
  update public.investments inv set
    current_price_ars = round(v_mep::numeric, 4),
    current_price_usd = 1,
    current_value_usd = round(inv.quantity::numeric, 2),
    current_value_ars = round((inv.quantity * v_mep)::numeric, 2),
    profit_loss_ars   = round((inv.quantity * (v_mep - coalesce(inv.avg_cost_ars, v_mep)))::numeric, 2),
    profit_loss_usd   = 0,
    profit_loss_pct   = case when coalesce(inv.avg_cost_ars, 0) > 0
                             then round(((v_mep - inv.avg_cost_ars) / inv.avg_cost_ars * 100)::numeric, 4)
                             else 0 end,
    last_updated = now()
  where inv.type in ('dolar_mep', 'usd_cash')
    and v_mep is not null;

  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  -- ── 3. Plazo fijo: capital + interés devengado a hoy (capado al venc.) ──
  with pf as (
    select
      id, currency, quantity,
      quantity
        * (coalesce(interest_rate, 0) / 100.0)
        * (greatest(0, least(coalesce(maturity_date, v_today), v_today) - coalesce(purchase_date, v_today)))::numeric
        / 365.0 as accrued
    from public.investments
    where type = 'plazo_fijo'
  )
  update public.investments inv set
    current_value_ars = round((case when pf.currency = 'ARS' then pf.quantity + pf.accrued
                                    when v_mep > 0 then (pf.quantity + pf.accrued) * v_mep end)::numeric, 2),
    current_value_usd = round((case when pf.currency = 'USD' then pf.quantity + pf.accrued
                                    when v_mep > 0 then (pf.quantity + pf.accrued) / v_mep end)::numeric, 2),
    profit_loss_ars   = round((case when pf.currency = 'ARS' then pf.accrued
                                    when v_mep > 0 then pf.accrued * v_mep end)::numeric, 2),
    profit_loss_usd   = round((case when pf.currency = 'USD' then pf.accrued
                                    when v_mep > 0 then pf.accrued / v_mep end)::numeric, 2),
    profit_loss_pct   = case when pf.quantity > 0 then round((pf.accrued / pf.quantity * 100)::numeric, 4) else 0 end,
    last_updated = now()
  from pf
  where inv.id = pf.id;

  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  return v_count;
end;
$$;

revoke all on function public.refresh_positions() from public;
grant execute on function public.refresh_positions() to service_role;
