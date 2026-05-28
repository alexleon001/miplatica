-- ============================================
-- Mi Platica — schema inicial (Sprint 0)
-- ============================================
-- Genera 9 tablas: profiles, accounts, transactions, investments, debts,
-- savings_goals, exchange_rates, asset_prices, budgets.
-- RLS habilitado en todas las tablas con datos de usuario.
--
-- Reglas:
--   - profiles.id = auth.users.id (1:1)
--   - Todas las tablas con datos de usuario usan owner_id (uuid) -> auth.users(id)
--   - exchange_rates y asset_prices son globales (sin owner) -> RLS lectura pública, escritura solo service_role
-- ============================================

create extension if not exists "pgcrypto";

-- ============================================
-- 1. PROFILES
-- ============================================
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text,
  monthly_income_ars   numeric(18, 2),
  monthly_income_usd   numeric(18, 2),
  preferred_usd_type   text not null default 'mep'
                       check (preferred_usd_type in ('mep', 'blue', 'oficial', 'ccl', 'tarjeta')),
  inflation_adjustment boolean not null default true,
  currency_display     text not null default 'both'
                       check (currency_display in ('ars', 'usd', 'both')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============================================
-- 2. ACCOUNTS
-- ============================================
create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  type                text not null
                      check (type in ('wallet', 'bank', 'broker', 'cash', 'crypto')),
  currency            text not null
                      check (currency in ('ARS', 'USD', 'USDT', 'BTC', 'EUR')),
  balance_amount      numeric(18, 4) not null default 0,
  balance_updated_at  timestamptz,
  integration_type    text not null default 'manual'
                      check (integration_type in ('api', 'csv', 'manual')),
  integration_status  text not null default 'manual'
                      check (integration_status in ('connected', 'pending', 'error', 'manual')),
  color               text,
  icon                text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.accounts (owner_id) where is_active;

-- ============================================
-- 3. TRANSACTIONS
-- ============================================
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete restrict,
  type          text not null
                check (type in ('income', 'expense', 'transfer', 'investment')),
  category      text,
  subcategory   text,
  amount_ars    numeric(18, 2) not null,
  amount_usd    numeric(18, 4),
  usd_rate_used numeric(18, 4),
  description   text,
  merchant      text,
  date          date not null default current_date,
  source        text not null default 'manual'
                check (source in ('manual', 'mercadopago_api', 'csv_import', 'ai_categorized')),
  external_id   text,
  tags          text[] default '{}',
  notes         text,
  created_at    timestamptz not null default now(),

  -- Deduplicación: una transacción de origen externo no se duplica por owner.
  constraint transactions_external_unique unique (owner_id, source, external_id)
);
create index on public.transactions (owner_id, date desc);
create index on public.transactions (account_id);
create index on public.transactions (owner_id, category) where category is not null;

-- ============================================
-- 4. INVESTMENTS
-- ============================================
create table public.investments (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  account_id         uuid references public.accounts(id) on delete set null,
  type               text not null
                     check (type in ('fci', 'cedear', 'accion', 'plazo_fijo', 'on', 'bono', 'lecap', 'dolar_mep', 'usd_cash', 'crypto')),
  ticker             text,
  name               text not null,
  quantity           numeric(20, 8) not null default 0,
  avg_cost_ars       numeric(18, 4),
  avg_cost_usd       numeric(18, 4),
  current_price_ars  numeric(18, 4),
  current_price_usd  numeric(18, 4),
  current_value_ars  numeric(18, 2),
  current_value_usd  numeric(18, 2),
  profit_loss_ars    numeric(18, 2),
  profit_loss_usd    numeric(18, 2),
  profit_loss_pct    numeric(8, 4),
  currency           text not null check (currency in ('ARS', 'USD')),
  purchase_date      date,
  maturity_date      date,
  interest_rate      numeric(8, 4),
  last_updated       timestamptz,
  created_at         timestamptz not null default now()
);
create index on public.investments (owner_id);
create index on public.investments (ticker) where ticker is not null;

-- ============================================
-- 5. DEBTS
-- ============================================
create table public.debts (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  type              text not null
                    check (type in ('credit_card', 'loan', 'informal', 'cuotas')),
  total_amount      numeric(18, 2) not null,
  remaining_amount  numeric(18, 2) not null,
  currency          text not null check (currency in ('ARS', 'USD')),
  interest_rate     numeric(8, 4),
  monthly_payment   numeric(18, 2),
  next_payment_date date,
  end_date          date,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);
create index on public.debts (owner_id) where is_active;

-- ============================================
-- 6. SAVINGS GOALS
-- ============================================
create table public.savings_goals (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  target_amount        numeric(18, 2) not null,
  target_currency      text not null check (target_currency in ('ARS', 'USD')),
  current_amount       numeric(18, 2) not null default 0,
  target_date          date,
  monthly_contribution numeric(18, 2),
  notes                text,
  created_at           timestamptz not null default now()
);
create index on public.savings_goals (owner_id);

-- ============================================
-- 7. EXCHANGE RATES (global, sin owner)
-- ============================================
create table public.exchange_rates (
  date       date primary key,
  oficial    numeric(18, 4),
  blue       numeric(18, 4),
  mep        numeric(18, 4),
  ccl        numeric(18, 4),
  tarjeta    numeric(18, 4),
  fetched_at timestamptz not null default now()
);

-- ============================================
-- 8. ASSET PRICES (global, sin owner)
-- ============================================
create table public.asset_prices (
  ticker        text primary key,
  name          text,
  price_ars     numeric(18, 4),
  price_usd     numeric(18, 4),
  variation_pct numeric(8, 4),
  fetched_at    timestamptz not null default now()
);

-- ============================================
-- 9. BUDGETS
-- ============================================
create table public.budgets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  month      int not null check (month between 1 and 12),
  year       int not null check (year between 2020 and 2100),
  category   text not null,
  limit_ars  numeric(18, 2) not null,
  spent_ars  numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint budgets_unique unique (owner_id, year, month, category)
);
create index on public.budgets (owner_id, year, month);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger trg_accounts_updated_at  before update on public.accounts  for each row execute function public.set_updated_at();

-- ============================================
-- RLS — Habilitación
-- ============================================
alter table public.profiles       enable row level security;
alter table public.accounts       enable row level security;
alter table public.transactions   enable row level security;
alter table public.investments    enable row level security;
alter table public.debts          enable row level security;
alter table public.savings_goals  enable row level security;
alter table public.budgets        enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.asset_prices   enable row level security;

-- ============================================
-- RLS POLICIES — Datos de usuario (owner_id = auth.uid())
-- ============================================
create policy "profiles: self-only"  on public.profiles      for all using (id       = auth.uid()) with check (id       = auth.uid());
create policy "accounts: owner-only" on public.accounts      for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "tx: owner-only"       on public.transactions  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "inv: owner-only"      on public.investments   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "debts: owner-only"    on public.debts         for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "goals: owner-only"    on public.savings_goals for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "budgets: owner-only"  on public.budgets       for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================
-- RLS POLICIES — Datos globales (lectura pública, escritura solo service_role)
-- ============================================
create policy "rates: read all"  on public.exchange_rates for select using (true);
create policy "prices: read all" on public.asset_prices   for select using (true);
-- Las Edge Functions usan service_role key (bypasea RLS), no necesitan policy de write.

-- ============================================
-- TRIGGER: crear profile automáticamente al signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
