-- ============================================
-- Mi Platica — budgets.spent_ars vivo (Sprint 6 adelantado)
-- ============================================
-- Mantiene budgets.spent_ars sincronizado con las transacciones de gasto de la
-- misma categoría/mes/año del owner. Antes spent_ars quedaba siempre en 0.
--
--   recompute_budget()   : recalcula spent_ars de un (owner, categoría, año, mes)
--   sync_budget_spent()  : trigger AFTER ins/upd/del en transactions
--   init_budget_spent()  : trigger BEFORE insert en budgets (inicializa desde
--                          las transacciones ya existentes)
--   + backfill de los budgets actuales
--
-- security definer + search_path: el trigger corre sobre la fila del usuario
-- (owner_id ya restringido por RLS al insertar la transacción), así que solo
-- toca presupuestos del mismo owner.
-- ============================================

create or replace function public.recompute_budget(p_owner uuid, p_category text, p_year int, p_month int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.budgets b
  set spent_ars = coalesce((
    select sum(tx.amount_ars)
    from public.transactions tx
    where tx.owner_id = p_owner
      and tx.category = p_category
      and tx.type = 'expense'
      and extract(year from tx.date)::int = p_year
      and extract(month from tx.date)::int = p_month
  ), 0)
  where b.owner_id = p_owner and b.category = p_category and b.year = p_year and b.month = p_month;
$$;

create or replace function public.sync_budget_spent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.category is not null then
    perform public.recompute_budget(
      old.owner_id, old.category,
      extract(year from old.date)::int, extract(month from old.date)::int
    );
  end if;
  if tg_op in ('UPDATE', 'INSERT') and new.category is not null then
    perform public.recompute_budget(
      new.owner_id, new.category,
      extract(year from new.date)::int, extract(month from new.date)::int
    );
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_budget_spent on public.transactions;
create trigger trg_sync_budget_spent
after insert or update or delete on public.transactions
for each row execute function public.sync_budget_spent();

create or replace function public.init_budget_spent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.spent_ars := coalesce((
    select sum(tx.amount_ars)
    from public.transactions tx
    where tx.owner_id = new.owner_id
      and tx.category = new.category
      and tx.type = 'expense'
      and extract(year from tx.date)::int = new.year
      and extract(month from tx.date)::int = new.month
  ), 0);
  return new;
end;
$$;

drop trigger if exists trg_init_budget_spent on public.budgets;
create trigger trg_init_budget_spent
before insert on public.budgets
for each row execute function public.init_budget_spent();

-- Backfill de los presupuestos existentes.
update public.budgets b
set spent_ars = coalesce((
  select sum(tx.amount_ars)
  from public.transactions tx
  where tx.owner_id = b.owner_id
    and tx.category = b.category
    and tx.type = 'expense'
    and extract(year from tx.date)::int = b.year
    and extract(month from tx.date)::int = b.month
), 0);
