# Mi Platica — Estado del Proyecto

> App móvil de finanzas personales con IA, foco Argentina (ARS/USD, inflación, MEP/Blue/CCL, FCI, CEDEARs, plazos fijos).
> Tagline: *"Tus finanzas, con inteligencia argentina"*

> **Nota de mantenimiento:** este archivo se carga en cada sesión. Mantenerlo **< 40k chars**. Es estado operativo vivo, no bitácora: el historial detallado vive en git. Al condensar, conservar la verdad operativa (IDs, pendientes, gotchas) y borrar lo ya implementado/historizado.

---

## Stack confirmado

| Capa | Tecnología | Versión / Notas |
|---|---|---|
| App móvil | React Native + Expo + Expo Router | Expo SDK 54, RN 0.81, React 19.1, expo-router 6 |
| Lenguaje | TypeScript | 5.8+ (strict, `noEmit`) |
| Package manager | pnpm (`node-linker=hoisted`) | Bun solo para tests (`bun test`) |
| Backend | Supabase (Postgres 17 + Auth + Edge Functions + Storage) | proyecto `mi-platica` (`jgszdxqhrbpfjqtqqlpw`) en `sa-east-1` |
| Estado global | Zustand 5 (`persist` sobre AsyncStorage) | currency display + usdType + stores local-first |
| Server state | TanStack Query 5 (+ `query-async-storage-persister`) | cache 5 min, persistor 24 h |
| IA | Claude vía Edge Function — `claude-sonnet-4-6` | ambos edges |
| OTA | EAS Update (`expo-updates`) | `runtimeVersion.policy=appVersion`, channels dev/preview/production |
| Cotizaciones | dolarapi.com + data912.com (BYMA) + argentinadatos (IPC/FCI) + CoinGecko (cripto) | sin auth |
| Tests | `bun test` (lógica) · Playwright/KATA en `tests/` (E2E web futuro, sin tocar) | |

**Repo:** `https://github.com/alexleon001/miplatica.git` · **Org Supabase:** `alexleon001` (`lfzwokjsazkhznvyvzbk`)
**Project URL:** `https://jgszdxqhrbpfjqtqqlpw.supabase.co` · **EAS projectId:** `1740d928-8419-49ff-9875-80fd4376a6ea` (owner `alexleon001`)

---

## Estado actual — sesión 9 en curso (2026-06-05)

- **4 features nuevas, todas OTA-safe (JS puro, local-first), sin commitear todavía** (push lo corre el user):
  1. **Alertas de cotización** — `lib/rate-alerts.ts` (puro, edge-trigger/histéresis con re-armado) + `lib/store/rate-alerts.ts` + `lib/hooks/use-rate-alerts.ts` (notif local al cruzar umbral, mismo patrón que budget-alerts) + pantalla `app/rate-alerts.tsx` + toggle en notif-prefs (`rateAlerts`). Entry en `more.tsx`. **Gotcha:** `applyTriggered` conserva la referencia del array si nada cambió (evita loop de renders).
  2. **Insights de gastos** — `lib/insights.ts` (puro: `monthlyTotals`/`categoryMovers`/`spendTrend`, multi-moneda con null-propagation) + `lib/hooks/use-insights.ts` (últimos 6 meses) + `app/insights.tsx` (gráfico barras gasto/ingreso con Views puras + tendencia + qué cambió). Entry en `more.tsx`.
  3. **Simulador de inversiones** — `lib/invest-sim.ts` (puro: `simulate` compara plazo fijo/FCI MM/dólar MEP, rendimiento real ajustado por inflación; `suggestedMonthlyInflation` del IPC; `realAnnualRate` Fisher) + `app/invest-sim.tsx` (tasas editables, USD vía MEP). Entry en `more.tsx`.
  4. **Categorías personalizadas** — registry mutable en `lib/categories.ts` (`registerCustomCategories`/`isBuiltInCategory`; `categoryById`/`categoriesByGroup` ahora mergean custom) + `lib/store/custom-categories.ts` (local, registra en rehidratación) + `lib/hooks/use-categories.ts` (`useCategoriesByGroup` reactivo para chips) + `app/categories.tsx` (alta con emoji/color/grupo). `add-transaction`/`add-budget` usan el hook. Store referenciado en `(tabs)/_layout.tsx` para registro temprano. **Caveat:** local por dispositivo (una tx con categoría custom guarda su id en DB pero en otro device cae a "sin categoría"); la IA sigue sugiriendo sólo built-in.
- **Tests:** 120 `bun test` verdes (+35: rate-alerts, insights, invest-sim, categories). `type-check:app` limpio.
- **Commiteado en `main` local:** `0ea1830` (features) + `2dddde9` (docs). **Falta `git push`** (lo corre el user).
- **🆕 OTA al canal `preview` PUBLICADO** (update group `9aaf63ee`, runtime `0.1.0`, android+ios, commit `2dddde9`) — sobre el APK `c368dc3e`. El device lo levanta reabriendo 2 veces.
- **🔴 Falta validar en device las 4 features** (entradas nuevas en "Más"): alertas de cotización (crear umbral, ver aviso al cruzar), insights (gráfico 6 meses + qué cambió), simulador (comparar plazo fijo/FCI/MEP), categorías custom (crear y usarla en un movimiento/presupuesto).

## Estado actual — cierre sesión 8 (2026-06-04)

- **Pusheado a `main`** hasta `30eadd3`. Edge `monthly-summary` DEPLOYADO (ACTIVE v1, vía MCP).
- **APK preview:** `c368dc3e` (runtime `0.1.0`, sesión 7 baked-in + `expo-linear-gradient` nativo). Previos: `de26cdb7`, `fa3d3965`, `2a8ddb8c`, `11dda3ab`.
- **OTAs vigentes al canal `preview`** (sobre `c368dc3e`, JS puro): los de sesión 7 (`fee9f3d3`, `0463f788`, `4b37dea0`) + sesión 8 `956c74b6` + fix FABs `2158d13c` (último, commit `30eadd3`). **El device levanta reabriendo la app 2 veces** (1ra baja, 2da aplica) y matando la app de verdad (en MIUI/HyperOS bloquearla en recientes).
- **Todo lo nuevo es OTA-safe** (JS puro, sin deps nativas nuevas) → no requiere rebuild. Excepción nativa pendiente de rebuild: `expo-linear-gradient` (ya en `c368dc3e`).
- **Tests:** 85 `bun test` verdes. `type-check:app` limpio.
- **Decisión transversal:** features que necesitan persistencia van **local-first** (Zustand+AsyncStorage); el único backend nuevo de sesión 8 es el edge `monthly-summary`.

### 🔴 Pendiente de validar en device (sesión 9)

1. **OTA `2158d13c` (fix FABs):** (a) Movimientos — desglose expandido, "Total del mes" se ve completo y el FAB "+ Nuevo" no lo tapa (desglose + banner recurrentes movidos al `ListHeaderComponent` del FlatList); (b) Proyección — FAB "+ Gasto" despegado de la barra del sistema (`Fab` acepta `bottomInset`).
2. **Resto de sesión 8:** proyección (auto-split cuotas, editar/borrar visible, checklist pagado, compartir, duplicar), alertas de presupuesto (80/100% + banner dashboard), **resumen mensual IA (¡probar que el edge responda!)**, sparkline de patrimonio (≥2 días de aperturas), desglose por categoría, prefs de notif, búsqueda, export CSV, recurrentes.
3. **Pendientes de sesión 7 (nunca validados):** refresh visual completo, selector de FCI con fondo real, proyección con saldo acumulado + aviso "te quedás sin efectivo en X", fix gasto puntual que ya no se repite, lag al cambiar de tab.
4. **Sesiones previas sin validar en device:** camino feliz general (CRUD 4 entidades, import CSV, presupuestos, portafolio, recordatorios), flujo MP OAuth completo en device, "real +Y%" de inflación, deep-links de notif.

**Observación del user (4/6):** 44 movimientos sin categoría y "Otros" = 94% del gasto → sugerir tocar "Categorizar con IA" (`categorize-batch`) para que el desglose y el resumen IA sean útiles.

**Gotchas:** recurrentes — el mes que los creás no aparecen en el banner (ya quedan registrados; los ofrece desde el mes siguiente). Sparkline — arranca vacío hasta 2 días de snapshots. Export CSV — va como texto por el share sheet (archivo real = dep nativa futura `expo-file-system`/`expo-sharing`).

**Bloqueado por el user:** Auth social Google/Apple (credenciales OAuth).

---

## Features que existen hoy

- **Dashboard** multi-moneda: `NetWorthCard` (héroe indigo, glow+blobs), `AccountsList`, `ExchangeRatesBar`, `CurrencyToggle`, pull-refresh, skeletons, errores con reintento. Banner de presupuesto (`BudgetBanner`/`budgetsAtRisk` ≥80%) + banner recordatorios (`UpcomingReminders`) + sparkline (`NetWorthChart`, Views puras sin svg).
- **Onboarding** (4 campos) con gate por `profile.name is null`; sincroniza currency store con el profile.
- **Movimientos**: lista + resumen mensual + filtros + búsqueda client-side + FAB; alta con flujo IA ("✨ Sugerir categoría"); optimistic insert con rollback. Banner "N sin categoría · Categorizar con IA" (`categorize-batch`). Desglose por categoría del mes (`SpendingBreakdown` + `lib/spending.ts`, trae todo el mes vía `use-month-spending`). Banner de recurrentes (`RecurringBanner`).
- **Inversiones**: 10 instrumentos tipados (`lib/instruments.ts` + `deriveInvestmentValues`), distribución (vista `v_portfolio_by_type` + `usePortfolioByType`), P&L, cotización live por ticker. `PnLBadge` muestra "real +Y%" (inflación). Precios stale marcados (`lib/prices.ts`).
- **FCI / Fondos comunes** (client-side, sin cron): `lib/fci.ts` usa slug del nombre como ticker. `use-fci-funds` trae lista + VCP del día de argentinadatos (`/v1/finanzas/fci/{mercadoDinero|rentaFija|rentaVariable|rentaMixta}/ultimo`, dedup por slug, cache 6h). `FundField` = selector buscable; en `add-investment` si tipo=FCI prefilla name/ticker/costo=VCP. Freshening client-side `freshenFci` (en `use-investments.ts`). Caveat: dashboard usa valor guardado hasta abrir Inversiones (atraso ≤1 día).
- **Deudas**: CRUD, resta al patrimonio neto. Píldora "Pagar" (`useRegisterDebtPayment` + modal `quick-amount`).
- **Metas de ahorro**: `savings_goals` CRUD (`add-goal`), progreso + ETA. Píldora "+ Aportar" (`useAddGoalContribution`). No entra al patrimonio neto.
- **Recordatorios de vencimiento**: `lib/reminders.ts` puro → banner in-app + notificaciones locales (`expo-notifications`, `useRemindersSync`: agenda día previo 09:00). Cubre deudas (`next_payment_date`) y metas (`target_date`). Deep-link al tocar la notif (deuda→tab Deudas, meta→Más).
- **Rendimiento real / inflación**: tabla `inflation` (IPC INDEC vía argentinadatos, 998 meses) + Edge `fetch-inflation` (cron días 4 y 17) + `useInflation` (self-healing) + `lib/inflation.ts` (`cumulativeInflation`, `realReturn` Fisher, `realReturnForPosition`). Real medido en pesos vs IPC acumulado desde `purchase_date ?? created_at`.
- **Proyección de pagos / cash-flow**: tablas `projection_items` (recurrencia `monthly`/`installments`/`once` + `payment_method` como grupo + `interest_rate` TNA nullable) + `projection_income` (override por mes; default `profile.monthly_income_ars`). `lib/projection.ts` puro: `buildProjection` (grilla mes×ítem agrupada por medio de pago + subtotales + TOTAL + neto + **saldo acumulado** sembrando `accounts_ars`, devuelve `cumulativeArs/Usd`/`firstDeficitMonth`/`deficitMonthCount`), `debtToProjItem`, `frenchPayment` (cuotas con interés), `projectionToText` (compartir). UI `app/projection.tsx`: tira de meses con neto + saldo, detalle del mes, editar/borrar visible (lápiz/tacho), checklist "pagado" por mes (`projection-paid.ts` local), duplicar (`?dup=id`). Modales `add-projection-item` (selector `MonthField` + cuotas sin interés por total → reparte `total/N`, guarda por-cuota; con interés → capital+TNA francés) + `set-income`. **Default recurrencia = `once`** (fix bug: antes `monthly` repetía gastos puntuales).
- **Presupuestos vivos**: `budgets.spent_ars` por triggers; modal de alta. Alertas locales 80/100% (`lib/budget-alerts.ts` + `use-budget-alerts`, dedup `id:level:YYYY-MM`).
- **Import CSV de brokers** (pegar texto): parser sin deps + dedup `external_id`.
- **Asesor financiero IA**: chat `app/advisor.tsx` → Edge `financial-advisor` (persona AR + prompt caching + contexto financiero + inflación vía RLS) → `use-advisor`. Historial persistido (`lib/store/advisor.ts`) + botón "Limpiar".
- **Resumen mensual IA**: Edge `monthly-summary` (gasto por categoría mes vs anterior + ingreso + inflación, Claude) + `use-monthly-summary` (cache 6h) + `app/monthly-summary.tsx` (entry en `more.tsx`) + compartir.
- **CRUD completo**: borrar las 4 entidades (long-press); editar (tap, reusa modal de alta; investments re-deriva).
- **Editar perfil**: modal `edit-profile` (nombre, ingreso ARS, dólar preferido, vista) → `useUpdateProfile`. El ingreso se refleja como sueldo default en la proyección.
- **Recurrentes / plantillas**: `lib/recurring.ts` puro + `lib/store/recurring.ts` local. Toggle "Repetir todos los meses" en alta → guarda plantilla; `RecurringBanner` registra pendientes del mes; `RecurringList` en Más. `source: "recurring"` en las tx.
- **Export CSV del mes**: `lib/csv-export.ts` (puro, RFC-4180) + acción en Más → Datos (comparte por share sheet como texto).
- **Prefs de notificaciones**: `lib/store/notif-prefs.ts` local + switches en Más; `useRemindersSync`/`useBudgetAlerts` las respetan.
- **Fix teclado tapa input (global)** ✅ device (v3): `components/KeyboardAwareScrollView.tsx` (puro JS, OTA-safe) en los 9 forms. v3 usa posición real del teclado (`keyboardDidShow` → `endCoordinates.screenY`) + `measureInWindow` del input + espaciador + 3 reintentos (60/180/350 ms). NO usa `KeyboardAvoidingView`/`measureLayout` (frágiles en Fabric). Chat asesor (FlatList): `use-keyboard-height` + `marginBottom: kbHeight` + `scrollToEnd`. Pendiente menor: scroll "flojo" → afinar `extraOffset` (hoy 28). (`set-income`/`quick-amount` con `View` simple.)
- **Date pickers** ✅ JS puro: `DateField.tsx` (→ `YYYY-MM-DD`) y `MonthField.tsx` (→ `YYYY-MM`) reemplazan TextInputs a mano en `add-goal`/`add-debt`/`add-investment`/`add-projection-item`. Resuelve el bug "gasto de julio caía en junio".
- **Branding/UI**: ícono + adaptive + splash (gradiente indigo→cyan + "$", `scripts/gen-icons.py` vía PIL). Tabs Ionicons sin header redundante, safe-area `top`; wordmark "Mi Platica" en dashboard.
- **Design system** (puro JS, OTA-safe): tokens `lib/colors.ts` (superficies en capas, acentos cyan) + `lib/theme.ts` (`spacing`/`radius`/`typography`/`shadow`, re-exporta `colors` — **importar de `lib/theme`**). Primitivas display `components/ui.tsx` (`Card`, `Fab` con `bottomInset`, `ScreenTitle`, `SectionLabel`, `CtaButton`, `ProgressBar`, `IconChip`) + form `components/form.tsx` (`FormScreen`, `FormField`, `FormInput`, `FormChip`, `ChipRow`, `SubmitButton`). Gradiente real vía `components/BrandGradient.tsx` (error boundary → cae a fondo sólido si el módulo nativo no está).

---

## Variables de entorno

| Variable | Dónde | Estado |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | cliente `.env` + `eas.json/preview env` | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | cliente `.env` + EAS env `preview` | ✅ (publishable `sb_publishable_...`) |
| `EXPO_PUBLIC_APP_ENV` | cliente `.env` + `eas.json/preview env` | ✅ |
| `ANTHROPIC_API_KEY` | **Edge Functions** (`supabase secrets set`) | ✅ seteada y verificada en device |
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` / `MP_REDIRECT_URI` / `MP_TOKEN_KEY` | **Edge Functions** | ✅ seteados; falta validar flujo en device |

> Regla #2: API keys sensibles **JAMÁS** en el cliente. Solo la anon publishable (diseñada para exponerse) viaja al bundle.

Setear la key de IA (lo corre el user, login interactivo):
```bash
bunx supabase login && bunx supabase link --project-ref jgszdxqhrbpfjqtqqlpw
bunx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Build del APK (EAS)

APK preview pega a Supabase **productivo**. Perfil `preview` → `buildType: apk`. Build remoto en EAS (no requiere Android SDK local). Auth: sesión guardada de `alexleon001` (no hay `EXPO_TOKEN` en el entorno; `eas whoami` OK). `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_APP_ENV` vienen del bloque `env` de `eas.json/preview`; la anon key del EAS env.

Rebuildear (con `EXPO_TOKEN` corre no-interactivo):
```bash
pnpm dlx eas-cli build -p android --profile preview --non-interactive
# log/descarga: https://expo.dev/accounts/alexleon001/projects/mi-platica/builds
```
Si cambia la anon key: `eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_... --visibility plaintext --type string`.

> **Cuota EAS Free:** los builds Android se agotan por mes (resetean el 1°). Cambios JS puros se entregan por **EAS Update (OTA)** al canal `preview` sin rebuild; solo deps nativas nuevas requieren APK.

---

## Mercado Pago — estado del setup

✅ **Backend live**: app MP creada, Redirect URI registrado (`https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/mp-oauth-callback`), 4 secrets seteados, migración `0007`, edges deployadas. Cliente: `use-mp.ts` + `MercadoPagoConnect` en `more.tsx` (`expo-web-browser`).

⏳ **Falta:** validar el flujo en device (Conectar MP → autorizar → Sincronizar → ver pagos). Sync manual (botón) + cron cada 6 h (`mp-sync-cron`).

**Lógica de sync (verificada en device: 187 gastos / 15 ingresos):** trae `regular_payment` aprobados, clasificados por dirección (`collector_id == mp_user_id` → ingreso; si no → gasto). Excluye `money_transfer`/`investment`/`account_fund`. Pagina hasta `MAX_PAGES`.

❌ **Saldo de billetera por API: IMPOSIBLE/cerrado.** OAuth da 403 `ForbiddenApiError` al balance de cuentas personales (no hay scope). La **cuenta MP lleva saldo manual** (Editar cuenta → cargar saldo; `add-account` muestra hint para cuentas `api`). Los pagos recibidos sí sincronizan.

**Gotchas debug:** Redirect URI debe coincidir EXACTO (secret + app MP, si no MP rechaza el `code`). Credenciales de **producción** (cuenta real). Si `MP_TOKEN_KEY` cambia, las conexiones guardadas no se descifran (reconectar). `ensureMpAccount` reusa cualquier cuenta del user con nombre tipo "mercado pago" (ilike) y promueve manual→`api`; no duplica.

---

## Decisiones técnicas clave

1. **Convivir Expo + Playwright** en el mismo repo (Playwright en `tests/` para E2E web futuro).
2. Supabase región `sa-east-1` (latencia AR).
3. **Publishable keys** (`sb_publishable_...`), no legacy anon JWT.
4. Edge Functions `verify_jwt: true` por defecto; cron/webhooks públicos explícitos con `verify_jwt=false`.
5. **Zustand** (currency + stores local-first) con `persist`; **TanStack Query** con persistor AsyncStorage (24 h) por conectividad AR inconsistente.
6. **Optimistic updates con rollback** en mutations de uso diario.
7. **Vistas SQL con `security_invoker=on`** → RLS de tablas underlying aplica.
8. **`tsconfig` split**: raíz extiende `expo/tsconfig.base` (app/lib/components); `tsconfig.test.json` para KATA/Playwright. Scripts `type-check:app` / `type-check:test`.
9. **Prompt caching** en Edge Functions de IA (system prompt con `cache_control: ephemeral`).
10. **Categorías como diccionario tipado** (`lib/categories.ts`), no enum DB; el modelo IA solo devuelve IDs de `CATEGORY_IDS`.
11. **`metro.config.cjs`** con `unstable_enableSymlinks`+`unstable_enablePackageExports` para symlinks de pnpm. `.cjs` porque `package.json` es `"type": "module"`.
12. **Persistencia nueva → local-first** (Zustand+AsyncStorage), evitando migraciones/crons a prod.

---

## Integraciones activas

- [x] Proyecto Supabase `mi-platica` (`sa-east-1`). 9 tablas + RLS + triggers (auto-profile, set_updated_at).
- [x] Vistas `v_net_worth`, `v_monthly_balance`, `v_portfolio_by_type` (`security_invoker=on`).
- [x] Auth Supabase (email+password) vía `lib/supabase.ts` + `lib/auth.tsx` + `use-profile.ts`. `useProfile` con `enabled: !!session`; `onAuthStateChange` hace `queryClient.clear()` en SIGNED_IN/OUT; persister `buster: "v2"`.
- [x] Edge `fetch-exchange-rates` (`verify_jwt=false`) → dolarapi → `exchange_rates`. Self-healing client-side.
- [x] Edge `categorize-transaction` (`verify_jwt=true`, prompt caching) → categoriza UNA tx (flujo "✨ Sugerir categoría").
- [x] Edge `categorize-batch` v1 (`verify_jwt=true`, prompt caching) → categoriza en lote `category IS NULL` (tandas de 50, valida grupo, fallback seguro). `useCategorizeBatch` + banner en Movimientos.
- [x] Edge `monthly-summary` v1 (`verify_jwt=true`, prompt caching, `claude-sonnet-4-6`) → resumen mensual NL. `use-monthly-summary` + `app/monthly-summary.tsx`.
- [x] Edge `financial-advisor` v2 (`verify_jwt=true`, prompt caching) → contexto user + inflación + rendimiento real por posición. Chat persistido client-side.
- [x] Edge `update-asset-prices` v4 (`verify_jwt=false`) → data912 + CoinGecko (cripto, 21 tickers) + dolarapi → `asset_prices`. Devuelve/loguea `coverage`. Llama `refresh_positions()` por RPC.
- [x] Edge `fetch-inflation` (`verify_jwt=false`) → argentinadatos → `inflation` (upsert idempotente). 998 meses backfilleados.
- [x] Función SQL `refresh_positions()` (migración `0003`, `security_definer`).
- [x] pg_cron (vía `net.http_post` keyless, probados): `update-asset-prices` (`*/15 14-20 * * 1-5`), `fetch-exchange-rates` (`*/30 * * * *`), `fetch-inflation` (`0 14 4,17 * *`), `mp-sync-cron` (`0 */6 * * *`).
- [x] Edge `mp-sync-cron` v7 (`verify_jwt=false`) → itera `mp_connections` con service_role, sincroniza pagos de cada una (lógica duplicada a propósito). Anti-abuso: saltea conexiones sync hace <30 min. Disparable a mano por SQL: `select net.http_post('…/functions/v1/mp-sync-cron', '{"Content-Type":"application/json"}'::jsonb, '{}'::jsonb)` (resetear `last_synced_at` antes para saltear anti-abuso; `?debug=1` para diagnóstico).
- [x] Edges MP OAuth: `mp-oauth-start` v1 (jwt), `mp-oauth-callback` v1 (público), `mp-sync-movements` v6 (jwt). 4 secrets seteados.
- [x] Import CSV de movimientos (Cocos/PPI/IOL/banco) por alias de columnas + dedup `external_id`.
- [x] FCI vía argentinadatos (client-side, sin cron) — selector de fondos + VCP del día.

**Migraciones aplicadas:** `0001_init_schema`, `0002_helper_views`, `0003_refresh_positions`, `0004_schedule_crons`, `0005_budget_spent_triggers`, `0006_inflation`, `0007_mp_connections` (cifrada con pgcrypto + `mp_oauth_states` + funciones `mp_store_connection`/`mp_get_tokens` con `search_path = public, extensions` — pgcrypto vive en `extensions`), `0008_portfolio_by_type` (vista `v_portfolio_by_type`), `0009_payment_projection` (`projection_items` + `projection_income`, RLS owner-only), `0010_schedule_mp_sync_cron`, `0011_projection_item_interest` (columna `interest_rate numeric(6,2)` nullable).

---

## Deuda técnica

- **Validación en device incompleta** (mayor riesgo acumulado): ver sección "Pendiente de validar". Solo Sprints 0→1 probados en Expo Go; asesor IA + MP sync verificados en device.
- **`expo-updates` reactivado**: `app.json` con `updates.url` real + `runtimeVersion`. Antes crasheaba al boot con URL inexistente; verificar boot del APK.
- **`update-asset-prices` depende de data912.com** (gratuita, no oficial, sin SLA) para acciones/CEDEARs/bonos/ON; cripto CoinGecko; MEP dolarapi; FCI argentinadatos. Si cambia el shape, ajustar `SOURCES`/`normalize`.
- **`expo-linear-gradient` es dep NATIVA** → gradiente real solo en APK rebuildeado (ya en `c368dc3e`). OTA-safe vía `BrandGradient` (cae a sólido indigo si falta el módulo).
- **Plazo fijo (interés devengado):** resuelto client-side — `freshenPlazoFijo` recalcula al vuelo (reusa `deriveInvestmentValues`), aplicado en Inversiones y dashboard (`useFreshNetWorth`). El valor en DB se sincroniza con el cron (atraso ~1 día, despreciable).
- **Android SDK local no instalado** → `pnpm android` falla. Usar Expo Go (QR) o EAS Build remoto.
- **Sin Sentry/observability** (descartado por el user). Errores de cliente y Edge Functions no se reportan; scheduling de notifs y flujos de IA fallan en silencio.
- **`type-check` corre dos `tsc` en serie** (app+test). `type-check:test` tiene errores KATA pre-existentes (falta `allure-js-commons`), ajenos a la app.
- **CI (sesión 9):** `.github/workflows/ci.yml` corre en push a `main` + PRs → `pnpm install --frozen-lockfile` + `lint:app` + `type-check:app` + `test:unit` (bun test lib). **Verde.** Node 22 + pnpm 11 (pnpm 11 exige Node ≥22.13), `concurrency` cancela runs viejos. Badge en README. Los crons KATA (`smoke.yml`/`regression.yml`) quedaron **deshabilitados** (comentado el `schedule:`; fallaban a diario en la validación de env contra un "staging" web inexistente) — disparables a mano por `workflow_dispatch`. `build.yml` corre en PRs (KATA framework). `sanity.yml` solo manual.
- **ESLint del app:** config propio `eslint.config.app.mjs` (script `lint:app` = `eslint --config … lib app components`). Separado del root `eslint.config.js` (KATA, choca con el estilo del app). Enfocado en **correctitud, no estilo**: @antfu con `stylistic:false` + sin type-aware (lo cubre `tsc`) + apagadas las reglas RN-hostiles (styles-at-bottom, sort-imports, interface-vs-type, regexp de normalización) + `eslint-plugin-react-hooks` (devDep nueva) para rules-of-hooks/exhaustive-deps. **0 errores, ~5 warnings** informativos (exhaustive-deps + `as any` de triggers de notif). `lint` (root, `eslint .`) sigue roto por KATA — usar `lint:app`.
- **Branch protection en `main` (sesión 9):** exige el check `Type-check & logic tests` verde para mergear PRs (`strict:true`), force-push y borrado bloqueados, `enforce_admins:false` (el admin puede pushear directo). Cambiar/quitar vía `gh api -X PUT repos/alexleon001/miplatica/branches/main/protection`.
- **`CLAUDE.boilerplate.md` + `tests/` (KATA/Playwright)** intactos, no apuntan a la app (su `bun test` sin scope falla por `@TestFixture`/`allure-js-commons`; por eso el CI usa `test:unit` = `bun test lib`).
- **Íconos placeholder** (`scripts/gen-icons.py`); reemplazar por diseño definitivo antes del store si se quiere.

---

## Reglas críticas operativas

1. **Nunca mostrar solo ARS** — toda pantalla con montos ofrece vista USD.
2. **API keys sensibles solo en Edge Functions**, jamás en cliente (la anon publishable sí puede ir al cliente).
3. **Tokens MP encriptados** con `pgcrypto`.
4. **Deduplicación obligatoria** por `external_id` en importaciones.
5. **Inflación:** rendimientos históricos siempre comparados contra IPC.
6. **TypeScript siempre** — sin `.js` (salvo configs `.cjs` necesarios).
7. **Confirmar migraciones SQL** antes de `apply_migration`.
8. **Idioma:** español argentino (vos) para el usuario; código y commits en inglés.
9. **No push a `main` sin OK explícito.** (el push lo corre el user — el clasificador lo bloquea acá).
10. **Sin AI attribution** en commits.
11. **Rol proactivo:** al cierre de cada sprint, proponer 2–4 mejoras.
12. **Commits van con `git commit --no-verify`** (el hook lint-staged/@antfu es de KATA, no aplica al app Expo).

---

## Workflow de sprints

| Sprint | Foco | Estado |
|---|---|---|
| 0 / 0.5 | Setup, auth, edge rates / type-safety, OTA, currency store, TanStack Query | ✅ |
| 1 / 1.5 | Dashboard multi-moneda / onboarding + sync profile | ✅ |
| 2 | Transacciones + categorización IA + presupuestos | ✅ |
| 3 | Portafolio con cotizaciones live | ✅ (backend+crons live; falta verificar UI en device) |
| 3.5 | Ajuste por inflación / rendimiento real | ✅ (falta verificar "real +Y%" en device) |
| 4 | Mercado Pago + import CSV | ✅ CSV + MP OAuth backend live (falta validar flujo en device) |
| 5 | Asesor financiero IA | ✅ (verificado en device; historial persistido + Limpiar) |
| 6 | Deudas, metas, presupuestos avanzados, recordatorios | ✅ |
| 7 | Refresh visual (design system) + proyección + FCI + gradiente | ✅ (pendiente validar en device) |
| 8 | Proyección avanzada + alertas presupuesto + resumen IA + sparkline + extras | ✅ shipped (pendiente validar en device) |

*Última actualización: 2026-06-05 (condensado para < 40k). Historial detallado por sesión/sprint en el git log.*
