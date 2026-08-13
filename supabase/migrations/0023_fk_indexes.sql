-- ============================================================================
-- Mi Plata — índices sobre las foreign keys que no los tenían
-- ============================================================================
-- Los reportó el performance advisor de Supabase (lint 0001_unindexed_foreign_keys).
-- Sin un índice que cubra la FK, Postgres hace seq scan de la tabla hija cada vez
-- que se borra o actualiza la fila padre — y en el dominio de gastos compartidos
-- eso pasa seguido (borrar un miembro recalcula splits, borrar un grupo cae en
-- cascada sobre gastos y liquidaciones). También encarece los joins de
-- `my_group_balances`.
--
-- Es puramente aditivo: no toca datos, RLS ni políticas. Las tablas hoy son
-- chicas, así que se crea al instante; se aplica ahora justamente para no tener
-- que hacerlo con usuarios reales encima.
-- ============================================================================

-- Gastos compartidos: la FK que más se recorre (un split por miembro por gasto)
create index if not exists expense_splits_member_id_idx
  on public.expense_splits (member_id);

-- Liquidaciones: 4 FKs, todas sin cubrir
create index if not exists settlements_from_member_idx
  on public.settlements (from_member);
create index if not exists settlements_to_member_idx
  on public.settlements (to_member);
create index if not exists settlements_created_by_idx
  on public.settlements (created_by);
create index if not exists settlements_recorded_transaction_id_idx
  on public.settlements (recorded_transaction_id);

-- Gastos del grupo
create index if not exists shared_expenses_paid_by_idx
  on public.shared_expenses (paid_by);
create index if not exists shared_expenses_created_by_idx
  on public.shared_expenses (created_by);

-- Inversiones ligadas a una cuenta (borrar una cuenta chequea esta FK)
create index if not exists investments_account_id_idx
  on public.investments (account_id);

-- Mercado Pago: estados de OAuth por usuario
create index if not exists mp_oauth_states_owner_id_idx
  on public.mp_oauth_states (owner_id);
