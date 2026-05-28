-- ============================================
-- Mi Platica — vistas helper para Dashboard (Sprint 1)
-- ============================================
-- v_net_worth        : patrimonio neto por owner (accounts + investments - debts)
-- v_monthly_balance  : balance mensual por owner (income - expense)
--
-- Ambas con security_invoker = on para que RLS de las tablas underlying
-- aplique al consumir la vista.
-- ============================================

create or replace view public.v_net_worth
with (security_invoker = on) as
with owner_accounts as (
  select
    owner_id,
    coalesce(sum(case when currency = 'ARS' then balance_amount else 0 end), 0) as accounts_ars,
    coalesce(sum(case when currency = 'USD' then balance_amount else 0 end), 0) as accounts_usd
  from public.accounts
  where is_active
  group by owner_id
),
owner_investments as (
  select
    owner_id,
    coalesce(sum(current_value_ars), 0) as investments_ars,
    coalesce(sum(current_value_usd), 0) as investments_usd
  from public.investments
  group by owner_id
),
owner_debts as (
  select
    owner_id,
    coalesce(sum(case when currency = 'ARS' then remaining_amount else 0 end), 0) as debts_ars,
    coalesce(sum(case when currency = 'USD' then remaining_amount else 0 end), 0) as debts_usd
  from public.debts
  where is_active
  group by owner_id
)
select
  coalesce(a.owner_id, i.owner_id, d.owner_id)                                              as owner_id,
  coalesce(a.accounts_ars, 0)                                                               as accounts_ars,
  coalesce(a.accounts_usd, 0)                                                               as accounts_usd,
  coalesce(i.investments_ars, 0)                                                            as investments_ars,
  coalesce(i.investments_usd, 0)                                                            as investments_usd,
  coalesce(d.debts_ars, 0)                                                                  as debts_ars,
  coalesce(d.debts_usd, 0)                                                                  as debts_usd,
  coalesce(a.accounts_ars, 0) + coalesce(i.investments_ars, 0) - coalesce(d.debts_ars, 0)   as net_ars,
  coalesce(a.accounts_usd, 0) + coalesce(i.investments_usd, 0) - coalesce(d.debts_usd, 0)   as net_usd
from owner_accounts a
full outer join owner_investments i on a.owner_id = i.owner_id
full outer join owner_debts d       on coalesce(a.owner_id, i.owner_id) = d.owner_id;


create or replace view public.v_monthly_balance
with (security_invoker = on) as
select
  owner_id,
  extract(year  from date)::int as year,
  extract(month from date)::int as month,
  coalesce(sum(case when type = 'income'  then amount_ars else 0 end), 0)
    - coalesce(sum(case when type = 'expense' then amount_ars else 0 end), 0) as balance_ars,
  coalesce(sum(case when type = 'income'  then amount_ars else 0 end), 0) as income_ars,
  coalesce(sum(case when type = 'expense' then amount_ars else 0 end), 0) as expense_ars
from public.transactions
where type in ('income', 'expense')
group by owner_id, extract(year from date), extract(month from date);
