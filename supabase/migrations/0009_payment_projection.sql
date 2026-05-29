-- ============================================
-- Mi Platica — Proyección de pagos / cash-flow (Sprint 5)
-- ============================================
-- Reemplaza el "Excel de proyección": ítems de gasto recurrentes / en cuotas /
-- únicos, agrupados por medio de pago, que la app proyecta mes a mes contra el
-- ingreso para mostrar el neto (Deuda/Ganancia) por mes.
--
-- - projection_items : cada gasto cargado una sola vez con su recurrencia.
-- - projection_income: override del ingreso por mes (ej. aguinaldo). El default
--   sale de profiles.monthly_income_ars; esta tabla solo guarda excepciones.
--
-- Las deudas (tabla debts) se inyectan a la proyección client-side (no se
-- duplican acá).
-- ============================================

create table public.projection_items (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  payment_method     text not null default 'Otros',   -- grupo: "TDC VISA", "TDC MASTER", "Mercado Pago"…
  category           text,
  amount             numeric(18, 2) not null,
  currency           text not null default 'ARS' check (currency in ('ARS', 'USD')),
  recurrence         text not null default 'monthly'
                     check (recurrence in ('monthly', 'installments', 'once')),
  start_month        date not null,                    -- se normaliza al día 1 del mes
  installments_total int,                              -- requerido si recurrence='installments'
  is_active          boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint projection_items_installments_chk
    check (recurrence <> 'installments' or (installments_total is not null and installments_total > 0))
);
create index on public.projection_items (owner_id) where is_active;

create table public.projection_income (
  owner_id   uuid not null references auth.users(id) on delete cascade,
  month      date not null,                            -- día 1 del mes
  amount_ars numeric(18, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, month)
);

alter table public.projection_items  enable row level security;
alter table public.projection_income enable row level security;

create policy "proj_items: owner-only"  on public.projection_items  for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "proj_income: owner-only" on public.projection_income for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create trigger trg_projection_items_updated_at  before update on public.projection_items
  for each row execute function public.set_updated_at();
create trigger trg_projection_income_updated_at before update on public.projection_income
  for each row execute function public.set_updated_at();
