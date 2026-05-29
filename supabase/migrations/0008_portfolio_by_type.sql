-- ============================================
-- Mi Platica — vista de distribución del portafolio (Sprint 5)
-- ============================================
-- v_portfolio_by_type : valor agregado de las posiciones por tipo de
-- instrumento, por owner. Mueve a SQL la agregación que hacía client-side
-- `components/PortfolioDistribution.tsx`. Reusable también por el asesor IA.
--
-- security_invoker = on → la RLS de `investments` aplica al consumir la vista.
--
-- Nota: usa `current_value_ars` GUARDADO en la tabla. Para plazo_fijo el
-- interés devengado se recalcula client-side al vuelo (freshenPlazoFijo) y solo
-- se persiste cuando corre el cron; el atraso (interés de ~1 día) es
-- despreciable para los porcentajes de distribución.
-- ============================================

create or replace view public.v_portfolio_by_type
with (security_invoker = on) as
with by_type as (
  select
    owner_id,
    type,
    coalesce(sum(current_value_ars), 0) as value_ars,
    coalesce(sum(current_value_usd), 0) as value_usd,
    count(*)                            as position_count
  from public.investments
  group by owner_id, type
  having coalesce(sum(current_value_ars), 0) > 0
),
totals as (
  select owner_id, sum(value_ars) as total_ars
  from by_type
  group by owner_id
)
select
  b.owner_id,
  b.type,
  b.value_ars,
  b.value_usd,
  b.position_count,
  case when t.total_ars > 0 then (b.value_ars / t.total_ars) * 100 else 0 end as pct
from by_type b
join totals t on t.owner_id = b.owner_id;
