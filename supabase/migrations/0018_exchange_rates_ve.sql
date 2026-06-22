-- ============================================
-- Mi Platica — cotizaciones Venezuela en exchange_rates
-- ============================================
-- exchange_rates es global (una fila por día, compartida por todos los usuarios).
-- Agrega las tasas venezolanas (Bs por USD) a esa misma fila: BCV (oficial) y
-- paralelo, vía ve.dolarapi.com. El cliente lee la columna según country/usdType
-- (ver rateForUsdType + lib/countries).
-- ============================================

alter table public.exchange_rates
  add column bcv      numeric(18, 4),
  add column paralelo numeric(18, 4);
