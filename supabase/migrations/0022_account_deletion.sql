-- ============================================
-- 0022_account_deletion
-- ============================================
-- Requisito de Google Play (política de eliminación de datos): el usuario tiene
-- que poder borrar su cuenta y sus datos desde la app y desde una URL pública.
-- El borrado corre en la edge `delete-account` vía auth.admin.deleteUser(): todas
-- las tablas de datos personales cuelgan de auth.users con `on delete cascade`,
-- así que se van solas.
--
-- BUG que arregla esta migración: en 0015 se declaró
--   created_by uuid not null references auth.users (id) on delete set null
-- en `shared_expenses` y `settlements`. La combinación es contradictoria: al
-- borrar el usuario, Postgres intenta poner NULL y falla con violación de
-- not-null → el borrado de cuenta reventaba para cualquiera que hubiese cargado
-- un gasto compartido o un settlement.
--
-- Decisión: dejar la columna nullable. El gasto/settlement sobrevive para el
-- resto del grupo (sus saldos no se rompen) con el autor en NULL = "usuario
-- eliminado". Las policies solo usan created_by en el WITH CHECK del insert, que
-- siempre lo setea, así que nada más cambia.

alter table public.shared_expenses alter column created_by drop not null;
alter table public.settlements     alter column created_by drop not null;

comment on column public.shared_expenses.created_by is
  'Autor del gasto. NULL = la cuenta fue eliminada (el gasto sigue contando para el grupo).';
comment on column public.settlements.created_by is
  'Autor del settlement. NULL = la cuenta fue eliminada.';
