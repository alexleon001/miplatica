-- ============================================================================
-- Mi Plata — datos de demostración para las cuentas de prueba de Google Play
-- ============================================================================
-- Problema que resuelve: la app muestra SIEMPRE el mes en curso (resumen
-- mensual, desglose por categoría, presupuestos —que son por año/mes—, banner
-- de alerta). Si los datos sembrados quedan en un mes viejo, el revisor de Play
-- abre la app y la ve vacía, que es la peor primera impresión posible.
--
-- Este script siembra el MES EN CURSO (lo deduce de current_date) para:
--   · miplata.review.ar@gmail.com  → cuenta de "App access" de Play (AR, ARS)
--   · miplata.tester.ve@gmail.com  → tester de Venezuela (VE, Bs)
--
-- Es IDEMPOTENTE: se apoya en los unique (owner_id, source, external_id) de
-- transactions y (owner_id, year, month, category) de budgets, así que se puede
-- correr cuantas veces se quiera. Los meses anteriores NO se tocan (el resumen
-- mensual compara contra el mes previo y necesita ese histórico).
--
-- CORRERLO: el 1° de cada mes hasta que la app esté publicada, y siempre antes
-- de mandar una versión a revisión. Desde el editor SQL de Supabase o con
-- `execute_sql`. No pide parámetros.
--
-- Las fechas se reparten proporcionalmente entre el día 1 y HOY, así que nunca
-- quedan movimientos con fecha futura (que se verían como un bug).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Argentina — cuenta de revisión de Play
-- ---------------------------------------------------------------------------
with usuario as (
  select id from auth.users where email = 'miplata.review.ar@gmail.com'
),
cotizacion as (
  select mep as tasa from exchange_rates order by date desc limit 1
),
mes as (
  select
    date_trunc('month', current_date)::date as inicio,
    -- tope 28 para que un mes corto no genere fechas fuera de rango
    least(extract(day from current_date)::int, 28) - 1 as dias_transcurridos,
    -- nombre en español a mano: to_char(..., 'TMMonth') depende del locale del server
    (array['enero','febrero','marzo','abril','mayo','junio',
           'julio','agosto','septiembre','octubre','noviembre','diciembre'])
      [extract(month from current_date)::int] as nombre
),
-- {mes} en las descripciones se reemplaza por el mes en curso
semilla (idx, pos, tipo, categoria, monto, descripcion, comercio, cuenta) as (values
  ( 1, 0.10, 'income',  'salary',        1950000, 'Sueldo {mes}',      'Empresa SA',   'Banco Galicia'),
  ( 2, 0.15, 'expense', 'rent',           480000, 'Alquiler',          'Inmobiliaria', 'Banco Galicia'),
  ( 3, 0.20, 'expense', 'supermarket',     98000, 'Compra semanal',    'Coto',         'Banco Galicia'),
  ( 4, 0.30, 'expense', 'transport',       38000, 'SUBE + taxis',      'SUBE',         'Efectivo'),
  ( 5, 0.38, 'expense', 'utilities',       34500, 'Luz y gas',         'Edenor',       'Banco Galicia'),
  ( 6, 0.45, 'expense', 'restaurants',     51000, 'Cena con amigos',   null,           'Banco Galicia'),
  ( 7, 0.50, 'expense', 'internet',        29500, 'Internet + cable',  'Telecentro',   'Banco Galicia'),
  ( 8, 0.58, 'expense', 'supermarket',     84000, 'Compra semanal',    'Carrefour',    'Banco Galicia'),
  ( 9, 0.65, 'expense', 'health',          58000, 'Prepaga',           'OSDE',         'Banco Galicia'),
  (10, 0.75, 'expense', 'entertainment',   24000, 'Cine y streaming',  null,           'Efectivo'),
  (11, 0.85, 'expense', 'supermarket',     91000, 'Compra semanal',    'Coto',         'Banco Galicia'),
  (12, 0.90, 'income',  'freelance',      350000, 'Proyecto freelance', null,          'Banco Galicia'),
  (13, 0.95, 'expense', 'tech',           120000, 'Teclado y mouse',   null,           'Cocos Capital')
)
insert into transactions (
  owner_id, account_id, type, category, amount_ars, amount_usd, usd_rate_used,
  description, merchant, date, source, external_id
)
select
  u.id,
  a.id,
  s.tipo,
  s.categoria,
  s.monto,
  round(s.monto / c.tasa, 4),
  c.tasa,
  replace(s.descripcion, '{mes}', m.nombre),
  s.comercio,
  m.inicio + round(s.pos * m.dias_transcurridos)::int,
  'manual',
  'seed-' || to_char(m.inicio, 'YYYY-MM') || '-' || lpad(s.idx::text, 2, '0')
from semilla s
cross join usuario u
cross join cotizacion c
cross join mes m
join accounts a on a.owner_id = u.id and a.name = s.cuenta
on conflict (owner_id, source, external_id) do update set
  account_id    = excluded.account_id,
  type          = excluded.type,
  category      = excluded.category,
  amount_ars    = excluded.amount_ars,
  amount_usd    = excluded.amount_usd,
  usd_rate_used = excluded.usd_rate_used,
  description   = excluded.description,
  merchant      = excluded.merchant,
  date          = excluded.date;

-- Presupuestos del mes: supermercado queda ~91% para que el revisor vea el
-- banner de alerta (se dispara al 80%). spent_ars lo calcula el trigger.
with usuario as (
  select id from auth.users where email = 'miplata.review.ar@gmail.com'
),
presupuesto (categoria, tope) as (values
  ('supermarket', 300000),
  ('restaurants', 120000),
  ('transport',    80000)
)
insert into budgets (owner_id, year, month, category, limit_ars)
select u.id, extract(year from current_date)::int, extract(month from current_date)::int, p.categoria, p.tope
from presupuesto p cross join usuario u
on conflict (owner_id, year, month, category) do update set limit_ars = excluded.limit_ars;

-- ---------------------------------------------------------------------------
-- 2. Venezuela — tester (montos en Bs, columnas _ars = slot de moneda local)
-- ---------------------------------------------------------------------------
with usuario as (
  select id from auth.users where email = 'miplata.tester.ve@gmail.com'
),
cotizacion as (
  select paralelo as tasa from exchange_rates order by date desc limit 1
),
mes as (
  select
    date_trunc('month', current_date)::date as inicio,
    least(extract(day from current_date)::int, 28) - 1 as dias_transcurridos,
    (array['enero','febrero','marzo','abril','mayo','junio',
           'julio','agosto','septiembre','octubre','noviembre','diciembre'])
      [extract(month from current_date)::int] as nombre
),
semilla (idx, pos, tipo, categoria, monto, descripcion, comercio, cuenta) as (values
  (1, 0.05, 'income',  'salary',      265000, 'Sueldo {mes}',        'Empresa',            'Banesco'),
  (2, 0.25, 'expense', 'supermarket',  13800, 'Mercado del mes',     'Central Madeirense', 'Banesco'),
  (3, 0.40, 'expense', 'transport',     2100, 'Metro + moto',        null,                 'Banesco'),
  (4, 0.60, 'expense', 'restaurants',   7200, 'Arepas con la banda', null,                 'Banesco'),
  (5, 0.75, 'expense', 'utilities',     9800, 'CANTV + luz',         'CANTV',              'Banesco'),
  (6, 0.90, 'expense', 'health',        5400, 'Farmacia',            'Farmatodo',          'Banesco')
)
insert into transactions (
  owner_id, account_id, type, category, amount_ars, amount_usd, usd_rate_used,
  description, merchant, date, source, external_id
)
select
  u.id,
  a.id,
  s.tipo,
  s.categoria,
  s.monto,
  round(s.monto / c.tasa, 4),
  c.tasa,
  replace(s.descripcion, '{mes}', m.nombre),
  s.comercio,
  m.inicio + round(s.pos * m.dias_transcurridos)::int,
  'manual',
  'seed-' || to_char(m.inicio, 'YYYY-MM') || '-' || lpad(s.idx::text, 2, '0')
from semilla s
cross join usuario u
cross join cotizacion c
cross join mes m
join accounts a on a.owner_id = u.id and a.name = s.cuenta
on conflict (owner_id, source, external_id) do update set
  account_id    = excluded.account_id,
  type          = excluded.type,
  category      = excluded.category,
  amount_ars    = excluded.amount_ars,
  amount_usd    = excluded.amount_usd,
  usd_rate_used = excluded.usd_rate_used,
  description   = excluded.description,
  merchant      = excluded.merchant,
  date          = excluded.date;

with usuario as (
  select id from auth.users where email = 'miplata.tester.ve@gmail.com'
),
presupuesto (categoria, tope) as (values
  ('supermarket', 16000),
  ('restaurants',  9000)
)
insert into budgets (owner_id, year, month, category, limit_ars)
select u.id, extract(year from current_date)::int, extract(month from current_date)::int, p.categoria, p.tope
from presupuesto p cross join usuario u
on conflict (owner_id, year, month, category) do update set limit_ars = excluded.limit_ars;

-- ---------------------------------------------------------------------------
-- 3. Saldos de cuentas: refrescar la marca de tiempo para que no se lean viejos
-- ---------------------------------------------------------------------------
update accounts set balance_updated_at = now()
where owner_id in (
  select id from auth.users
  where email in ('miplata.review.ar@gmail.com', 'miplata.tester.ve@gmail.com')
);
