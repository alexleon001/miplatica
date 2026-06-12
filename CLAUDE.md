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
**Privacy policy:** `https://miplatica.vercel.app/` (Vercel proyecto `miplatica`, sirve `web/`; redeploy automático en cada push a `main`)

---

## Estado actual — sesión 14 (2026-06-11)

**Foco: política de privacidad hosteada + verificación secret/build + link legal in-app + condensar este archivo.**

- **✅ Política de privacidad LIVE: `https://miplatica.vercel.app/`** — `web/index.html` (HTML estático es-AR, mismo contenido que `docs/privacy-policy.md`) en Vercel, proyecto `miplatica` (cuenta `alexleon001`, CLI autenticado vía device-flow). `.vercelignore` limita el upload del CLI a `web/` + `vercel.json` (**gotcha:** usar la forma `/*` + `!/web`; con `*` + `!web/**` Vercel NO re-incluye y sube 1 solo archivo → 404); `vercel.json` con `installCommand`/`buildCommand` vacíos + `outputDirectory=web` para que los deploys git-triggered tampoco intenten buildear el app Expo. **El CLI conectó la integración GitHub: cada `git push` a `main` redeploya la página.** Verificado: la raíz sirve la política y nada del fuente quedó expuesto (404 en package.json/app.json/lib/.env).
- **Link "Política de privacidad" al pie de Más** (`Linking.openURL`; Play exige acceso in-app). OTA-safe. Commit `16828d8`.
- **✅ Secret `REVENUECAT_WEBHOOK_SECRET` confirmado seteado** (probe POST con Authorization falsa → 401; sin secret daría 500 "misconfigured"). Webhook operativo a la espera de eventos.
- **✅ Build `960d0f60` FINISHED** (android `preview`, runtime `0.1.0`, expira 2026-06-25) — primer APK con los módulos nativos de ads/IAP. Falta instalarlo en el device.
- **✅ Webhook RC verificado END-TO-END:** el webhook del panel ("Supabase entitlements") tenía la URL bien pero el header Authorization VACÍO (por eso nunca llegaba nada); el user lo cargó (secret en `memory/project_monetization.md` — NO acá: repo público) y el "Send test event" dio **200 en el edge** (verificado en logs). Circuito RevenueCat → Supabase `entitlements` operativo.
- **Tests:** 120 `bun test` verdes · `type-check:app` limpio · `lint:app` 0 errores (5 warnings pre-existentes).
- **🔴 Pendiente:** (1) instalar APK `960d0f60` y validar en device: banner test al pie del dashboard (Free) · 402→paywall en IA · IA OK con Pro manual · paywall con stub de compra (esperado sin subs en Play); (2) **Play Console**: subir AAB a track de testing interno + crear subs `pro_monthly` (base `monthly`, ~US$2,49) y `pro_annual` (base `annual`, ~US$19,99) — recién ahí el paywall carga packages y la compra sandbox puebla `entitlements` vía el webhook ya verificado; (3) `git push` (15+ commits; dispara el redeploy de la página, esperado); (4) menores: íconos definitivos, interstitial/rewarded (JS puro, OTA-eable post-rebuild).

## Historial operativo condensado (sesiones 8–13; detalle en git log)

- **Fase 1 monetización server-side (completa s12):** migración `0012` aplicada · `_shared/ai-gate.ts` (`requireProAi`: 402 sin Pro, 429 cuota 50/día) deployado en las 4 edges de IA (`categorize-transaction` v8 · `categorize-batch` v2 · `monthly-summary` v2 · `financial-advisor` v9, `verify_jwt=true`). **Layout deploy MCP con `_shared`:** `files=[{"<fn>/index.ts"},{"_shared/ai-gate.ts"}]` + `entrypoint_path="<fn>/index.ts"`.
- **Fase 2 cliente (completa s13, `f2ecd6a`):** `react-native-purchases` 10.2.2 + `react-native-google-mobile-ads` 16.3.3 (NATIVAS) accedidas solo vía `require()` guardado → OTA-safe (sin módulo/env degrada a stub/sin ads). `lib/purchases.ts` (configure + `logIn(supabaseUserId)` sync con la sesión en `_layout`; **el entitlement RC se llama `pro`**) · paywall con compra real/restore/precios de tienda + `refreshProSoon` (invalida `is_pro` a 0/4/12 s por latencia del webhook) · `lib/ads.ts` + `AdBanner` (UMP lazy solo cuando un Free monta un anuncio; `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`: literal `test`=TestIds de Google, vacío fuera de `__DEV__`=sin anuncios) · AdMob App ID real en `app.json` (`f55f07f`). Panel RC armado: productos `pro_monthly:monthly`/`pro_annual:annual`, entitlement `pro`, offering `default`. Edge `revenuecat-webhook` v1 ACTIVE (`verify_jwt=false`, auth = header Authorization == secret, falla cerrado).
- **User con Pro manual:** fila en `entitlements` (`user_id 9fcdac6f-e19d-414b-aff2-96d417fa344d`, `store='manual'`, sin vencimiento). Quitar: `update entitlements set is_pro=false where store='manual'`.
- **🔴 GOTCHA OTA:** `eas update` empaqueta el **working tree**, no el commit. El gating de Fase 1 ya salió a `preview` (s11): ahí todos quedan Free salvo fila en `entitlements` (`usePro` falla cerrado; override dev solo `__DEV__`). **Fase 1+2 van a producción juntas (rebuild).** Bug-fixes/UI sí son OTA-eables sueltos.
- **APKs preview:** `960d0f60` (s13, primero con ads/IAP nativos) ← `c368dc3e` (s8, `expo-linear-gradient`). Un OTA se aplica reabriendo la app 2 veces (matándola de verdad; en MIUI/HyperOS bloquearla en recientes).
- **🔴 Backlog de validación en device (s7–s13, casi nada corrido):** monetización (banner/402/paywall/Pro manual) · s11 (movimientos agrupados por fecha + filtro categoría, empty states con CTA, card "Primeros pasos") · s9 (alertas de cotización, insights, simulador, categorías custom) · s8 (proyección avanzada, alertas de presupuesto 80/100%, resumen mensual IA, sparkline, export CSV, recurrentes, prefs notif, fix FABs) · s7 (refresh visual, selector FCI real, saldo acumulado + aviso "te quedás sin efectivo en X") · previos (camino feliz CRUD, import CSV, MP OAuth en device, "real +Y%", deep-links de notif).
- **Gotchas UX:** recurrentes no aparecen en el banner el mes en que se crean · sparkline vacío hasta ≥2 días de snapshots · export CSV sale como texto por el share sheet · categorías custom son locales por device (la IA solo sugiere built-in).
- **Observación del user (4/6):** 44 movimientos sin categoría y "Otros"=94% del gasto → correr "Categorizar con IA" para que desglose/resumen sirvan.
- **Bloqueado por el user:** Auth social Google/Apple (credenciales OAuth).

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
| `REVENUECAT_WEBHOOK_SECRET` | **Edge Functions** (webhook RevenueCat) | ✅ seteado y cargado como Authorization en panel RC; test event → 200 verificado (s14) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | cliente `.env` + EAS env | ✅ `goog_YDDN...` en `.env` + EAS preview/production |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | cliente `.env` + EAS env | ✅ `preview`/`.env`=`test` (TestIds); `production`=unit real (clicks propios en ads reales = tráfico inválido) |

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

**Migraciones aplicadas:** `0001_init_schema`, `0002_helper_views`, `0003_refresh_positions`, `0004_schedule_crons`, `0005_budget_spent_triggers`, `0006_inflation`, `0007_mp_connections` (cifrada con pgcrypto + `mp_oauth_states` + funciones `mp_store_connection`/`mp_get_tokens` con `search_path = public, extensions` — pgcrypto vive en `extensions`), `0008_portfolio_by_type` (vista `v_portfolio_by_type`), `0009_payment_projection` (`projection_items` + `projection_income`, RLS owner-only), `0010_schedule_mp_sync_cron`, `0011_projection_item_interest` (columna `interest_rate numeric(6,2)` nullable), `0012_entitlements` (✅ **aplicada 2026-06-09** — Pro/IA: tabla `entitlements` + `is_pro()` + `ai_usage_daily` + `consume_ai_quota()`).

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
| 9 | Alertas cotización + insights + simulador + categorías custom + CI/ESLint | ✅ (pendiente validar en device) |
| 10 | Monetización (freemium ads + Pro con IA, RevenueCat) + fixes device | 🚧 Fase 1 ✅ (s12) · Fase 2 código+build+webhook end-to-end ✅ + privacy policy live (s14); falta subs en Play Console + validar device |
| 11 | Mejoras UX OTA-safe: movimientos por fecha + filtro categoría + empty states con CTA + card "Primeros pasos" | ✅ commiteado/OTA (pendiente validar en device) |
| 12 | Cierre Fase 1: commit del batch + `database.types` regenerado (sin cast) + redeploy de las 4 edges con gate | ✅ server-side completo (pendiente validar 402/paywall en device) |

*Última actualización: 2026-06-11 (sesión 14: privacy policy live en miplatica.vercel.app + link in-app + webhook RC verificado end-to-end (test event 200) + build `960d0f60` FINISHED; falta Play Console + validación en device). Historial detallado por sesión/sprint en el git log.*
