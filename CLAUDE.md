# Mi Platica — Estado del Proyecto

> App móvil de finanzas personales con IA, foco Argentina (ARS/USD, inflación, MEP/Blue/CCL, FCI, CEDEARs, plazos fijos).
> Tagline: *"Tus finanzas, con inteligencia argentina"*

---

## Stack confirmado

| Capa | Tecnología | Versión / Notas |
|---|---|---|
| App móvil | React Native + Expo + Expo Router | Expo SDK 54, RN 0.81, React 19.1 |
| Lenguaje | TypeScript | 5.8+ (strict, `noEmit`) |
| Runtime / Package manager | Bun | 1.x (heredado del boilerplate KATA) |
| Backend | Supabase (Postgres 17 + Auth + Edge Functions + Storage) | proyecto `mi-platica` (`jgszdxqhrbpfjqtqqlpw`) en `sa-east-1` |
| Estado global | Zustand 5 (con `persist` sobre AsyncStorage) | currency display + usdType |
| Server state | TanStack Query 5 (`@tanstack/react-query` + `query-async-storage-persister`) | cache 5 min, persistor 24 h |
| IA | Claude vía Edge Function — `claude-sonnet-4-5-20250929` | upgrade a sonnet-4-6 cuando esté GA (ver Deuda técnica) |
| OTA | EAS Update (`expo-updates`) | `runtimeVersion.policy=appVersion`, channels dev/preview/production |
| Tests E2E (futuro) | Playwright + KATA | heredado del boilerplate, vive en `tests/`, sin tocar |
| Cotizaciones | dolarapi.com (gratis) + CAFCI + BYMA (Sprint 3) | sin auth |

**Repo:** `https://github.com/alexleon001/miplatica.git`
**Org Supabase:** `alexleon001` (`lfzwokjsazkhznvyvzbk`)
**Project URL:** `https://jgszdxqhrbpfjqtqqlpw.supabase.co`

---

## Sprint actual

**Sprint 3 (portafolio de inversiones) — código + backend + crons 100% live; falta validar UI en device** (2026-05-28).

Sprints 0 → 2 completos, pusheados a `main`, **y verificados en device** (Expo Go Android SDK 54). Sprint 3 escrito siguiendo los patrones establecidos (hooks + optimistic + componentes + modal + Edge Function). Backend live y verificado: Edge Function `update-asset-prices` **desplegada** (1734 cotizaciones reales en `asset_prices`), migración `refresh_positions` **aplicada** (revaloriza posiciones; la llama por RPC), **pg_cron configurado** (jobs `update-asset-prices` cada 15 min lun-vie + `fetch-exchange-rates` cada 30 min, ambos vía `net.http_post` keyless, probados end-to-end). `type-check:app` limpio en los archivos nuevos (los 4 errores restantes son ruido pre-existente de KATA en `api/`, `cli/`, `app/_layout.tsx`). **Único pendiente:** validar el flujo de inversiones en Expo Go.

---

## Última tarea completada

- [x] Lectura completa de `FINANZAS_SUPER_PROMPT.md`
- [x] Análisis de la plantilla actual (`kata-playwright-boilerplate` de UPEX Galaxy) — decisión: **convive**, se reutiliza lo que sirve (TS, `.context/`, `.prompts/`, `.claude/`, MCPs); Playwright queda en `tests/` para futuros E2E.
- [x] `autoskills` instalado (`bun`, `playwright-best-practices`, `typescript-advanced-types`).
- [x] `CLAUDE.md` del boilerplate archivado como `CLAUDE.boilerplate.md`.
- [x] Organización Supabase identificada: `alexleon001` (`lfzwokjsazkhznvyvzbk`).
- [x] `.env.example` extendido con bloque Mi Platica.
- [x] `package.json` renombrado a `mi-platica` y deps Expo/Supabase agregadas.
- [x] `app.json` Expo config (`scheme: miplatica`, new arch, typed routes).
- [x] Estructura Expo Router: `app/_layout.tsx` (AuthGate), `app/(auth)/login.tsx`, `app/(tabs)/_layout.tsx` + 5 pantallas placeholder (`index`, `transactions`, `investments`, `debts`, `more`).
- [x] `lib/`: `supabase.ts` (cliente con AsyncStorage), `auth.tsx` (AuthProvider + useAuth), `env.ts`, `colors.ts`.
- [x] `supabase/migrations/0001_init_schema.sql` listo (9 tablas, RLS, trigger auto-profile) — **NO aplicado** (esperando project mi-platica).
- [x] `supabase/functions/fetch-exchange-rates/index.ts` listo — **NO desplegado**.
- [x] `.gitignore` extendido con artefactos Expo y supabase local.
- [x] `git init` + remote a `alexleon001/miplatica.git` + commit `b10fd28` (sin push).
- [x] **Sprint 0.5/1** — Tipos Supabase autogenerados (`lib/database.types.ts` + script `bun run db:types` + cliente tipado con `Database`).
- [x] **Sprint 0.5/2** — EAS Update OTA (`eas.json` con channels, `app.json` con `runtimeVersion.policy: appVersion` + `updates.checkAutomatically: ON_LOAD` + plugin `expo-updates`).
- [x] **Sprint 0.5/3** — Currency store (`lib/store/currency.ts` Zustand+AsyncStorage) + `components/CurrencyToggle.tsx` integrado en Dashboard.
- [x] **Sprint 0.5/4** — TanStack Query + persistor offline (`lib/query-client.ts`, `lib/query-provider.tsx` envolviendo el root, `lib/hooks/use-exchange-rates.ts` como hook de referencia).
- [x] Dashboard usa el patrón end-to-end: `CurrencyToggle` → `useCurrencyStore` → muestra ARS/USD según display, y `useExchangeRates` cachea la última tasa.
- [x] **Sprint 1/A** — Migration `0002_helper_views.sql` aplicada (vistas `v_net_worth`, `v_monthly_balance` con `security_invoker = on`). Tipos regenerados.
- [x] **Sprint 1/B** — `tsconfig.json` split en dos: raíz extiende `expo/tsconfig.base` (app/lib/components/scripts), `tsconfig.test.json` mantiene KATA/Playwright. Scripts `type-check:app` / `type-check:test`.
- [x] **Sprint 1/C** — `components/MoneyAmount.tsx` reusable (formato es-AR, size sm/md/lg, tone default/positive/negative, consume `useCurrencyStore`).
- [x] **Sprint 1/D** — `useExchangeRates` self-healing: si la última row no es de hoy, dispara `fetch-exchange-rates` Edge Function (best-effort, no rompe UI si falla).
- [x] **Sprint 1/E** — Hooks `useAccounts()` (activas) + `useNetWorth()` (lee `v_net_worth`).
- [x] **Sprint 1/F** — `NetWorthCard` (patrimonio neto + breakdown) + `AccountsList` (lista + CTA "+ Agregar cuenta") + `ExchangeRatesBar` (4 tasas, resalta la activa).
- [x] **Sprint 1/G** — `app/modals/_layout.tsx` + `app/modals/add-account.tsx` (form name/type/currency/balance; invalidate accounts + net_worth on success).
- [x] **Sprint 1/H** — Dashboard final: saludo personalizado + fecha en es-AR + CurrencyToggle + NetWorthCard + AccountsList + ExchangeRatesBar.
- [x] **Sprint 1.5** — `useProfile` + `useUpdateProfile` hooks; pantalla `onboarding.tsx` (4 campos: nombre, ingreso, dólar preferido, display). `AuthGate` redirige a onboarding si `profile.name is null`; sincroniza el currency store con `profile.preferred_usd_type` + `profile.currency_display`.
- [x] **Sprint 2/A** — `lib/categories.ts` con 19 categorías tipadas (label/icon emoji/color/group). Helpers `categoryById`, `categoriesByGroup`, `CATEGORY_IDS`.
- [x] **Sprint 2/B** — Edge Function `categorize-transaction` desplegada (v1, ACTIVE, `verify_jwt=true`). Usa Claude (`claude-sonnet-4-5-20250929` por ahora; cambiar a sonnet-4-6 cuando esté GA) con **prompt caching** sobre el system prompt. Fallback robusto si el modelo inventa categorías o devuelve JSON inválido. **Requiere `ANTHROPIC_API_KEY` en Supabase secrets.**
- [x] **Sprint 2/C** — `lib/hooks/use-transactions.ts`, `use-monthly-balance.ts` (lee `v_monthly_balance`), `use-create-transaction.ts` (optimistic update con rollback), `use-categorize-transaction.ts`.
- [x] **Sprint 2/D** — `components/TransactionItem.tsx` (icon + label + signed MoneyAmount). Pantalla `transactions.tsx` con resumen del mes (income/expense/balance), chips de filtro, FAB "+ Nuevo".
- [x] **Sprint 2/E** — `app/modals/add-transaction.tsx` con flujo: tipo + monto + descripción → botón ✨ "Sugerir categoría con IA" → category chips → submit con optimistic insert.
- [x] **Sprint 2/F** — `lib/hooks/use-budgets.ts` + `components/BudgetsList.tsx` (barra de progreso con colores por umbral 80%/100%+). `more.tsx` integra BudgetsList + sección Perfil + Cerrar sesión.
- [x] **Sprint 3/A** — `lib/instruments.ts`: diccionario tipado de 10 instrumentos (fci/cedear/accion/plazo_fijo/on/bono/lecap/dolar_mep/usd_cash/crypto) con label/icon/color/moneda/`fields` por tipo. Incluye `deriveInvestmentValues` (lógica pura: calcula current_value/profit_loss en ARS+USD según moneda + tasa MEP; casos especiales para plazo fijo —interés devengado a hoy— y dólar MEP/billete —rendimiento real en ARS—).
- [x] **Sprint 3/B** — Hooks `useInvestments` (lista ordenada por valor), `useAssetPrice(ticker)` (cotización cacheada en `asset_prices`), `useCreateInvestment` (optimistic con rollback; deriva valores y invalida `investments` + `net_worth`).
- [x] **Sprint 3/C** — Componentes `PnLBadge` (pct con flecha + color), `InvestmentRow` (icon + nombre + valor + badge), `PortfolioDistribution` (barra apilada + leyenda por tipo, agregado client-side).
- [x] **Sprint 3/D** — Pantalla `investments.tsx`: CurrencyToggle + resumen (valor + resultado total) + distribución + lista de posiciones + FAB "+ Nueva".
- [x] **Sprint 3/E** — Modal `add-investment.tsx` con switch de campos por tipo de instrumento (`instrument.fields`), lookup de precio live por ticker, conversión con la tasa del `usdType` activo, create optimistic.
- [x] **Sprint 3/F** — Edge Function `update-asset-prices` (best-effort, cron 15min): consume data912.com (acciones/CEDEARs/bonos/ON) + dolarapi (MEP) → upsert en `asset_prices`. **Desplegada (v1, ACTIVE, `verify_jwt=false`) y probada: 1734 cotizaciones reales.**
- [x] **Sprint 3/G** — Migración `0003_refresh_positions.sql` **aplicada**: función `public.refresh_positions()` (espejo SQL de `deriveInvestmentValues`; recalcula valor + P&L de mercado/dólar/plazo-fijo con la última tasa MEP). `security definer`, solo `service_role`. La Edge Function `update-asset-prices` la llama por RPC al final (best-effort). Tipos regenerados (`Functions.refresh_positions`).

## Próxima tarea

**Operativo Sprint 3 (lo único que falta para cerrar el sprint):**
- ⏳ **Validar Sprint 3 en Expo Go**: crear una posición de cada tipo, ver distribución + P&L, confirmar que el patrimonio neto (Dashboard) sube con la nueva inversión.
- ✅ pg_cron ya configurado (jobs `update-asset-prices` 15 min + `fetch-exchange-rates` 30 min). El portafolio se revaloriza solo en horario bursátil.

**Sprint 4 — Integración Mercado Pago + import CSV brokers** (próximo bloque de features).

**Operativo heredado (sigue pendiente del usuario):**
- ⚠️ **Setear `ANTHROPIC_API_KEY` en Supabase secrets** (sin esto, modal add-transaction "Sugerir con IA" devuelve 500):
  ```
  bunx supabase login
  bunx supabase link --project-ref jgszdxqhrbpfjqtqqlpw
  bunx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
  ```
- `bun install` (deps de Sprint 2: ninguna nueva).
- Configurar pg_cron para `fetch-exchange-rates` cada 30 min.
- (Sprint 3) configurar pg_cron para `update-asset-prices` cada 15 min en horario bursátil.

---

## Variables de entorno requeridas

| Variable | Dónde | Estado |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | cliente (app, `.env`) | ✅ seteada |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | cliente (app, `.env`) | ✅ seteada (publishable `sb_publishable_...`) |
| `EXPO_PUBLIC_APP_ENV` | cliente (app, `.env`) | ✅ seteada (`development`) |
| `ANTHROPIC_API_KEY` | **Edge Functions** (`supabase secrets set`) | ⚠️ **pendiente del user** (bloquea "Sugerir IA") |
| `MP_CLIENT_ID` | **Edge Functions** | ⏳ Sprint 4 |
| `MP_CLIENT_SECRET` | **Edge Functions** | ⏳ Sprint 4 |
| `MP_REDIRECT_URI` | **Edge Functions** | ⏳ Sprint 4 |

> Regla #2 del super prompt: API keys **JAMÁS** en el cliente. Todo lo sensible vive en Edge Functions / Supabase secrets.

---

## Decisiones técnicas tomadas

| # | Decisión | Razón |
|---|---|---|
| 1 | Convivir Expo + Playwright en el mismo repo | Usuario pidió misma carpeta y reutilizar lo que sirva. Playwright se mantiene para E2E web futuro (panel admin, edge functions). |
| 2 | Región Supabase = `sa-east-1` (São Paulo) | Latencia óptima para usuarios AR. |
| 3 | Usar **publishable keys** (`sb_publishable_...`), no legacy anon JWT | Mejor seguridad y rotación independiente (recomendación oficial Supabase). |
| 4 | Edge Functions con `verify_jwt: true` por defecto | Toda función requiere usuario auth, salvo cron/webhooks explícitamente públicos (`fetch-exchange-rates` queda con `verify_jwt=false`). |
| 5 | Naming del proyecto: `mi-platica` (kebab-case) | Convención Supabase. |
| 6 | `claude-sonnet-4-5-20250929` para IA | Más reciente GA al 2026-05-28. Migrar a `claude-sonnet-4-6` cuando salga (ver Deuda técnica). |
| 7 | Tipos de cambio: `dolarapi.com`, sin auth, cron 30 min | Suficiente para v1; sin scraping. |
| 8 | **Zustand** para currency state (display + usdType) con `persist` en AsyncStorage | Estado global mínimo, sin React Context boilerplate. Persiste preferencia entre sesiones. |
| 9 | **TanStack Query** con persistor AsyncStorage (24 h) | Conectividad inconsistente en AR (subte, ascensores) → cache local + revalidación + retries. |
| 10 | **Optimistic updates con rollback** en `useCreateTransaction` | UX instantáneo para movimientos diarios. Pattern aplicable a todos los `useMutation` futuros (Sprint 3+). |
| 11 | **Vistas SQL con `security_invoker = on`** (`v_net_worth`, `v_monthly_balance`) | RLS de las tablas underlying aplica al consumir las vistas → menos código de filtrado en cliente. |
| 12 | **`tsconfig` split**: raíz extiende `expo/tsconfig.base` para app; `tsconfig.test.json` para KATA/Playwright | Evita choques de `types` (`react-native` vs `@playwright/test`). |
| 13 | **Prompt caching** en `categorize-transaction` (system prompt con `cache_control: ephemeral`) | El system prompt cambia poco; ahorra ~80% tokens en categorizaciones repetidas. |
| 14 | **`AuthGate` redirige a `onboarding`** si `profile.name is null` | Gate suave: el user nuevo configura preferencias antes de ver el Dashboard. Sincroniza el currency store con el profile. |
| 15 | **Categorías como diccionario tipado** (`lib/categories.ts`) en vez de enum DB | Permite cambiar label/icon/color sin migration. El modelo IA solo puede devolver IDs de `CATEGORY_IDS`. |

---

## 💡 Ideas propuestas por Claude Code

### Sprint 0 — cierre (2026-05-28)

> Propuestas derivadas de lo construido en Sprint 0. El usuario decide cuáles incluir antes de pasar a Sprint 1.

1. **Tipos de Supabase autogenerados (`db.types.ts`)**
   - Qué resuelve: el cliente Supabase actual está sin tipar → perdés autocompletado y type-safety en queries (`supabase.from('accounts').select(...)` devuelve `any`). El esquema ya tiene 9 tablas y va a crecer.
   - Cómo: script `bun run db:types` que invoca `mcp__Supabase__generate_typescript_types` y escribe `lib/database.types.ts`. Opcional: GitHub Action que regenera al merge a `main` y abre PR si cambió.
   - Complejidad: **baja**
   - Sprint sugerido: 0.5 (junto con la creación real del proyecto Supabase) — habilita Sprint 1 con type-safety desde el día 1.

2. **Estado global del selector ARS/USD/Ambos + tipo de cambio (Zustand + AsyncStorage)**
   - Qué resuelve: la regla #1 del super prompt dice "nunca mostrar solo ARS, siempre ofrecer USD". Eso implica que cada pantalla necesita saber: ¿en qué moneda mostrar? ¿qué tipo de cambio usar (MEP/Blue/Oficial)? Si lo paso por prop drilling se vuelve un caos. Si vive en `profiles` se necesita un fetch por arranque.
   - Cómo: `lib/store/currency.ts` con Zustand + middleware `persist` sobre AsyncStorage. Hidrata al boot, escribe al cambiar el toggle.
   - Complejidad: **baja**
   - Sprint sugerido: 1 (Dashboard) — bloquea el `CurrencyToggle` componente.

3. **EAS Update (OTA) configurado desde Sprint 0**
   - Qué resuelve: el flujo de iteración va a ser intenso (6 sprints). Sin OTA, cada bug fix obliga a recompilar y republicar. EAS Update permite pushear cambios JS/TS sin pasar por App/Play Store. Costo: gratis hasta 1k MAU.
   - Cómo: `bunx eas-cli init`, `app.json` add `updates.url`, `runtimeVersion.policy: "appVersion"`. Configurar canal `preview` y `production`.
   - Complejidad: **baja** (config) / **media** (estrategia de versionado de runtime vs JS)
   - Sprint sugerido: 0.5 (antes de Sprint 1) o Sprint 2.

4. **Cache + revalidación con TanStack Query (con persistor en AsyncStorage)**
   - Qué resuelve: Argentina tiene conectividad inconsistente (subte, ascensores, lugares con mala señal). Si abrís la app y se queda en un spinner mientras espera Supabase, mala UX. TanStack Query con persistor te da: lectura instantánea desde cache, revalidación en background, retries automáticos, dedupe de requests, paginación, etc.
   - Cómo: `@tanstack/react-query` + `@tanstack/query-async-storage-persister`. Provider en `_layout.tsx`. Migrar la primera query (patrimonio) en Sprint 1 como pattern de referencia.
   - Complejidad: **media** (setup baja, migración progresiva media)
   - Sprint sugerido: 1 (Dashboard, donde más se nota la latencia).

---

### Sprint 2 — cierre (2026-05-28)

> Propuestas derivadas de Sprint 2 (transacciones + IA + budgets MVP).

1. **Edge Function `update-asset-prices`** (cron 15 min en horario bursátil)
   - Qué resuelve: Sprint 3 necesita cotizaciones live para CEDEARs, FCI y MEP. Sin cron, el user las ve stale. Patrón análogo a `fetch-exchange-rates` (ya probado, OK).
   - Complejidad: **media** (3 fuentes: BYMA + CAFCI + dolarapi → normalizar a `asset_prices`)
   - Sprint sugerido: 3

2. **Componente `PnLBadge` reusable** (variación con color)
   - Qué resuelve: Sprint 3 lo necesita por cada posición. Sprint 1 retrofit lo usaría también para "variación 30d del patrimonio". Centralizá colores + formato.
   - Complejidad: **baja**
   - Sprint sugerido: 3 (early, antes de InvestmentRow)

3. **Ajuste por inflación en cards de variación**
   - Qué resuelve: regla del super prompt #5 ("rendimientos históricos: siempre IPC"). Mostrar "+15% nominal / −2% real" donde aplique. Requiere endpoint de IPC mensual (ej `https://api.argentinadatos.com/v1/finanzas/indices/inflacion`).
   - Complejidad: **media-alta**
   - Sprint sugerido: 3 o 4 (depende de qué tan crítica sea la métrica real en el portafolio inicial)

4. **Modal `add-budget.tsx` + invalidaciones en cascada al crear/editar transacciones de la categoría**
   - Qué resuelve: hoy `BudgetsList` solo muestra; no se pueden crear desde UI. Cuando esté el modal, el `useCreateTransaction` también debería invalidar `budgets` para que `spent_ars` se refleje en tiempo real (hoy `spent_ars` no se actualiza automáticamente — viene de un trigger pendiente).
   - Complejidad: **baja** (modal) + **media** (trigger SQL que mantiene `budgets.spent_ars` consistente)
   - Sprint sugerido: 6 (per super prompt) — o adelantarlo a 2.5 si quisieras presupuestos vivos antes.

---

### Sprint 3 — cierre (2026-05-28)

> Propuestas derivadas de Sprint 3 (portafolio de inversiones).

1. **Job batch `refresh-positions`** — ✅ HECHO (migración `0003_refresh_positions.sql`, función SQL llamada por RPC desde `update-asset-prices`). Pendiente solo el cron que la dispara periódicamente.

2. **Vista SQL `v_portfolio_by_type`** (`security_invoker=on`) para la distribución.
   - Qué resuelve: hoy `PortfolioDistribution` agrega client-side. Con muchas posiciones conviene una vista pre-agregada (como `v_net_worth`).
   - Complejidad: **baja**. Sprint sugerido: 3.5 o cuando crezca el portafolio.

3. **Resiliencia de fuentes de cotización**: hoy `update-asset-prices` depende de data912.com (no oficial). Si cae o cambia el shape, las posiciones no se actualizan.
   - Mejora: agregar fallback (CAFCI para FCI, criptoya para cripto), normalizar y loguear cobertura por fuente. Sentry para alertar si una fuente devuelve 0 filas.
   - Complejidad: **media**. Sprint sugerido: 3.5/4.

4. **Ajuste por inflación en el P&L** (regla #5 del super prompt): mostrar "+X% nominal / +Y% real" en `PnLBadge` para posiciones en ARS, usando IPC mensual (argentinadatos). Ya estaba propuesto en Sprint 2; ahora hay dónde colgarlo.
   - Complejidad: **media-alta**. Sprint sugerido: 4.

---

### Sprint 1 — cierre (2026-05-28)

> Propuestas derivadas de Sprint 1 (Dashboard real con NetWorth + AccountsList + ExchangeRatesBar).

1. **`useProfile()` + onboarding al primer login**
   - Qué resuelve: el user nuevo entra al Dashboard con todos los defaults (`preferred_usd_type=mep`, `currency_display=both`, sin ingresos mensuales). Vale la pena un onboarding de 3 pasos en `app/(auth)/onboarding.tsx` que actualice `profiles` y, además, sirva como gate antes del Dashboard si `profiles.name is null`.
   - Complejidad: **baja-media**
   - Sprint sugerido: 1.5 (puente entre Sprint 1 y 2) — debe correr antes de Sprint 2 para que `currency_display` venga del perfil y no del store por default.

2. **Edge Function `categorize-transaction` con Claude Sonnet 4.6**
   - Qué resuelve: clave del Sprint 2. Acepta `{ description, amount, currency, account_name }`, devuelve `{ category, subcategory, merchant_normalized, confidence, is_recurrent, notes }` parseado a JSON estricto.
   - Complejidad: **media** (prompt + rate limits + cache de respuestas comunes con Redis o `asset_prices`-like tabla)
   - Sprint sugerido: 2 — bloquea el modal add-transaction con autosugerencia.

3. **`lib/categories.ts` — diccionario centralizado**
   - Qué resuelve: hoy `transactions.category` es text libre. Sin un diccionario con label/icon/color/grupo, cada UI inventa su propio mapeo (ya pasó en `AccountsList` con `TYPE_LABELS`). Centralizarlo evita drift.
   - Complejidad: **baja**
   - Sprint sugerido: 2 — antes del modal add-transaction.

4. **`useMutation` patterns + optimistic updates**
   - Qué resuelve: en Sprint 1 el insert de cuenta es sync (`busy=true → await → invalidate`). Para transacciones (que son muchas por día), eso va a parecer lento. Patrón con `onMutate` para actualizar la cache inmediatamente, rollback si falla.
   - Complejidad: **baja-media**
   - Sprint sugerido: 2.

---

### Sprint 0.5 — cierre (2026-05-28)

> Propuestas derivadas de Sprint 0.5 (type-safety + OTA + currency store + offline cache).

1. **Componente `MoneyAmount` reutilizable**
   - Qué resuelve: cada pantalla a partir de Sprint 1 va a renderear amounts (saldos, ganancias, gastos). Si replico la lógica display/usdType en cada una → DRY violado. Centralizarlo en `<MoneyAmount ars={...} usd={...} />` evita 20 bugs futuros.
   - Complejidad: **baja**
   - Sprint sugerido: 1 (early, antes de la primera Card).

2. **`useExchangeRates` con auto-trigger del Edge Function si la data es del día anterior**
   - Qué resuelve: si el cron pg_cron no se ejecuta (Supabase Free tier puede tener limitaciones), el cliente no debería mostrar tasa stale. Hook detecta `date != today` y dispara POST a `fetch-exchange-rates` antes de retornar.
   - Complejidad: **media**
   - Sprint sugerido: 1 o 2.

3. **Migration `0002_helper_views.sql` con vistas SQL pre-calculadas**
   - Qué resuelve: el Dashboard necesita patrimonio neto, balance mensual, totales por categoría. Hacerlo en el cliente requiere fetchar todo y agregar en JS. Una vista `v_net_worth` y `v_monthly_balance` reduce queries y mejora latencia. RLS se aplica naturalmente vía las tablas underlying.
   - Complejidad: **baja-media**
   - Sprint sugerido: 1 (junto con el primer hook de NetWorthCard).

4. **Separar `tsconfig.app.json` (Expo) de `tsconfig.test.json` (Playwright)**
   - Qué resuelve: hoy hay UN solo `tsconfig.json` que mezcla `types: ["bun", "node", "@playwright/test"]` con paths Expo. Cuando `expo install --check` corra, va a empujar `extends: "expo/tsconfig.base"`. Conviene un `tsconfig.app.json` (extends Expo) + `tsconfig.test.json` (KATA) + raíz que use project references.
   - Complejidad: **media**
   - Sprint sugerido: 1 (o cuando el type-check empiece a quejarse).

---

### 🔌 Otras integraciones que podrían sumar (no urgentes)

- **Apple Sign-In / Google Sign-In** desde Sprint 1: reduce fricción de signup. Apple Sign-In es **obligatorio** para iOS App Store si hay otros social logins (puede esperar a primera publicación).
- **Sentry** para errores y Edge Function logs: 5k errors/mes gratis. Vale la pena antes del primer beta de usuario real.
- **Crash analytics + perf monitoring** vía Expo native modules (Firebase Crashlytics o Sentry).

---

## Integraciones activas

- [x] **Proyecto Supabase `mi-platica`** en `sa-east-1` (id `jgszdxqhrbpfjqtqqlpw`).
- [x] **Migración `init_schema`** aplicada — 9 tablas + RLS + triggers (auto-profile, set_updated_at).
- [x] **Migración `helper_views`** aplicada — `v_net_worth`, `v_monthly_balance` con `security_invoker=on`.
- [x] **Auth Supabase** (email + password) cableada vía `lib/supabase.ts` + `lib/auth.tsx` + `lib/hooks/use-profile.ts`.
- [x] **Edge Function `fetch-exchange-rates`** desplegada (v1, ACTIVE, `verify_jwt=false`). Consume `dolarapi.com`, upsert en `exchange_rates`. Self-healing desde el cliente vía `useExchangeRates`.
- [x] **Edge Function `categorize-transaction`** desplegada (v1, ACTIVE, `verify_jwt=true`). Claude `sonnet-4-5-20250929` con prompt caching. ⚠️ **Sin `ANTHROPIC_API_KEY` devuelve 500.**
- [x] **Edge Function `update-asset-prices`** desplegada (v1, ACTIVE, `verify_jwt=false`). data912 + dolarapi → `asset_prices` (probada: 1734 filas). Llama `refresh_positions()` por RPC al final.
- [x] **Migración `refresh_positions`** aplicada — función que revaloriza posiciones (`security_definer`, solo `service_role`).
- [x] **pg_cron `fetch-exchange-rates`** cada 30 min (`*/30 * * * *`) — configurado (migración `0004`, jobid 2, vía `net.http_post` keyless).
- [x] **pg_cron `update-asset-prices`** cada 15 min lun-vie 14-20 UTC (`*/15 14-20 * * 1-5`, jobid 1) — configurado y probado end-to-end.
- [ ] **`ANTHROPIC_API_KEY`** seteada en Supabase secrets — bloquea "Sugerir IA" en `add-transaction`.
- [ ] **EAS Update `updates.url`** completar con `bunx eas update:configure` (después de `eas-cli init`).
- [ ] Mercado Pago OAuth — Sprint 4
- [~] BYMA — vía data912.com en `update-asset-prices` (escrita, sin desplegar). CAFCI (FCI) aún sin fuente.
- [ ] CSV Cocos Capital — Sprint 4
- [ ] CSV Portfolio Personal — Sprint 4
- [ ] Open Banking BCRA — eval Sprint 5+

---

## Deuda técnica

- **App probada parcialmente** (2026-05-28): `pnpm install` ✅, `pnpm start` levanta Metro y QR ✅. Expo Go abre el bundle pero **antes de levantar la UI**, `expo-updates` con `checkAutomatically: ON_LOAD` intenta bajar update remoto del endpoint default → `java.io.IOException: Failed to download remote update`. Bloqueos resueltos:
    - `app.json` declaraba `web` con `favicon: ./assets/favicon.png` inexistente → bundler crasheaba al abrir `--web`. **Fix:** se removió bloque `web` y refs a `assets/` (Expo usa defaults). Si en Sprint 4+ se suma panel web, agregar `react-native-web` + `@expo/metro-runtime` y volver a poner `web` en `app.json`.
    - Script `web` removido del `package.json`.
    - **Plugin `expo-updates` + bloque `updates` + `runtimeVersion`** removidos del `app.json`. Sin `updates.url` configurada (porque no se corrió `eas init`), `expo-updates` arrancaba al boot, intentaba pegarle a un endpoint inexistente y crasheaba con `IOException`. Se reactiva automáticamente cuando se corra `pnpm dlx eas-cli init` + `pnpm dlx eas update:configure` — esos comandos vuelven a meter plugin + URL + runtimeVersion en `app.json`.
    - **Dep `expo-updates` también removida de `package.json`**. La sola presencia del módulo nativo en `node_modules/expo-updates` lo activaba al boot incluso sin estar en `plugins`. Lo agregamos de vuelta con `pnpm dlx expo install expo-updates` cuando hagamos `eas-cli init`.
    - **`metro.config.cjs` agregado** para hacer Metro pnpm-friendly. Sin `unstable_enableSymlinks: true` + `unstable_enablePackageExports: true`, Metro no resuelve los symlinks de `node_modules/.pnpm/...` y crashea con `TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received an instance of Object` al primer bundle request. **Extension `.cjs`** porque `package.json` tiene `"type": "module"` heredado de KATA, así que `.js` se interpretaría como ESM y Metro expone `getDefaultConfig` como CJS (`require`).
- **Android SDK local no instalado.** `pnpm android` falla con "Default install location not found". Workarounds:
    - **Expo Go en celular** (más simple) — escanear QR del Metro server.
    - **EAS Build remoto** (`pnpm dlx eas-cli build --profile development --platform android` → APK que se instala en el celular).
    - Instalar Android Studio (opcional, solo si el user quiere emulador local).
- **`assets/icon.png`, `splash.png`, `adaptive-icon.png`** sin archivos reales (Expo usa defaults). Agregar antes del primer EAS Build de production y reactivar refs en `app.json`.
- **`claude-sonnet-4-5-20250929` en `categorize-transaction`** — migrar a `claude-sonnet-4-6` cuando esté GA. Solo cambia el `MODEL` const en `supabase/functions/categorize-transaction/index.ts` y redeploy.
- **`budgets.spent_ars` no se mantiene solo.** Falta trigger SQL que recalcule al insert/update/delete de `transactions` que tienen `category` matcheada. Hoy `BudgetsList` muestra `spent_ars=0` siempre. Sprint 6 (o 2.5 si se quiere antes).
- **pg_cron — RESUELTO (migración `0004`).** Jobs `update-asset-prices` (15 min, lun-vie, horario bursátil) y `fetch-exchange-rates` (30 min). Llaman las Edge Functions vía `net.http_post` keyless (ambas `verify_jwt=false`). Verificar corridas en `cron.job_run_details` / `net._http_response` si algo falla.
- **Revalorización de posiciones (Sprint 3, paso 7) — RESUELTO vía `refresh_positions()` + cron.** La función SQL (migración `0003`) recalcula `current_value_*`/`profit_loss_*`; la llama `update-asset-prices` por RPC tras cada carga de precios, y ahora el cron la dispara cada 15 min. ⚠️ Sutileza: el plazo fijo (interés devengado) solo se actualiza cuando corre ese cron, no al abrir la app — fuera de horario bursátil el devengado puede verse con hasta ~1 día de atraso. Si molesta, recalcular plazo fijo client-side al render o agregar un cron diario.
- **`update-asset-prices` depende de data912.com** (fuente gratuita no oficial, sin SLA). Si cambia el shape de la respuesta, ajustar `SOURCES`/`normalize` en la función. FCI (CAFCI) y cripto todavía no tienen fuente conectada.
- **`CLAUDE.boilerplate.md`** queda como referencia del kata-playwright-boilerplate. Si nunca se usa Playwright en el proyecto, archivar/borrar.
- **`tests/` (KATA/Playwright)** sigue intacto pero no apunta a la app Mi Platica. Si se decide testear la app móvil con Maestro o Detox, replantear esta carpeta. Si se mantiene para tests web (panel admin futuro), adaptar `tests/components/ui/` cuando exista.
- **Sin Sentry / observability.** Errores del cliente y de Edge Functions no se reportan. Sprint 3+ es buen momento para sumar `@sentry/react-native` (5k errors/mes free).
- **Sin onboarding gate para usuarios viejos.** Si un user creó cuenta antes de Sprint 1.5 (no aplica acá, pero general), `profile.name` puede ser null → AuthGate los manda a onboarding. Está bien.
- **`type-check` del repo entero** corre dos `tsc` en serie (app + test). Lento en CI eventual. Considerar `concurrently` o project references cuando crezca.
- **EAS `projectId: null`** en `app.json/extra/eas`. Se autocompleta con `bunx eas-cli init`. Sin esto, `eas build` falla.

---

## Reglas críticas operativas (resumen)

1. **Nunca mostrar solo ARS** — toda pantalla con montos ofrece vista USD.
2. **API keys solo en Edge Functions**, jamás en cliente.
3. **Tokens MP encriptados** con `pgcrypto`.
4. **Deduplicación obligatoria** por `external_id` en importaciones CSV.
5. **Inflación**: rendimientos históricos siempre comparados contra IPC.
6. **TypeScript siempre** — sin `.js`.
7. **Confirmar migraciones SQL** antes de `apply_migration` a Supabase.
8. **Idioma:** español argentino (vos) para el usuario; código y commits en inglés.
9. **No push a `main` sin OK explícito.**
10. **Sin AI attribution** en commits.
11. **Rol proactivo:** al cierre de cada sprint, proponer 2–4 mejoras y registrarlas arriba.

---

## Workflow de sprints

| Sprint | Foco | Estado |
|---|---|---|
| 0 | Setup, navegación, Supabase, auth, edge function rates | ✅ done (2026-05-28) |
| 0.5 | Type-safety (db.types), EAS Update, Currency store, TanStack Query | ✅ done (2026-05-28) |
| 1 | Dashboard patrimonial multi-moneda | ✅ done (2026-05-28) |
| 1.5 | Onboarding al primer login + sincronización con profile | ✅ done (2026-05-28) |
| 2 | Transacciones + categorización IA + presupuestos | ✅ done (2026-05-28) |
| 3 | Portafolio de inversiones con cotizaciones live | ✅ código done (2026-05-28); falta deploy `update-asset-prices` + verificar en device |
| 4 | Integración Mercado Pago + import CSV brokers | ⏳ |
| 5 | Asesor financiero IA (chat con contexto completo) | ⏳ |
| 6 | Deudas, metas y presupuestos avanzados | ⏳ |

---

## Sesión 2026-05-28 — pausa para testing

Acumulamos Sprints 0 → 2 en una sola sesión, **sin probar la app**. Antes de seguir con Sprint 3, validar el camino feliz end-to-end con Expo Go. Si algo rompe, anotar acá en "Deuda técnica" y arreglar antes de avanzar.

**Checklist de testing operativo:**

- [x] `pnpm install` corre limpio (con `node-linker=hoisted`)
- [x] `pnpm start --clear` levanta Metro y muestra QR
- [x] Escaneo QR con Expo Go → app levanta sin crash
- [x] Signup con email/password → redirige a onboarding
- [x] Onboarding: completar 4 campos → redirige a Dashboard
- [x] Dashboard: muestra "Hola, alexanderleon001 👋", fecha "Jueves, 28 De Mayo", currency toggle
- [x] Cambiar toggle ARS / USD / Ambas → re-renderiza montos
- [x] Cambiar selector MEP / Blue / Oficial / CCL → barra inferior resalta el activo (Blue $1.440 ✅)
- [x] `useExchangeRates` self-healing dispara `fetch-exchange-rates` y trae 4 tasas reales
- [x] `useNetWorth` lee vista `v_net_worth` → $0 ARS / $0 USD (esperado sin cuentas)
- [x] Empty state de AccountsList con CTA "+ Agregar cuenta"
- [x] Bottom tabs nav: Patrimonio, Movimientos, Inversiones, Deudas, Más
- [ ] "+ Agregar cuenta" → modal → submit → cuenta aparece en lista
- [ ] Tab Movimientos → ver lista vacía + FAB "+ Nuevo"
- [ ] Modal add-transaction → completar tipo + monto + descripción + cuenta
- [ ] Botón "✨ Sugerir categoría con IA" → categoría se prellena (requiere ANTHROPIC_API_KEY en Supabase secrets)
- [ ] Submit transacción → vuelve a lista, transacción aparece al toque (optimistic), se confirma
- [ ] Dashboard: el patrimonio neto refleja la nueva transacción (vista SQL `v_net_worth`)
- [ ] Tab Más → muestra Perfil + Sesión + Cerrar sesión
- [ ] Cerrar sesión → vuelve a login

*Última actualización: 2026-05-28.*
