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
| Estado global | Zustand 5 (`persist` sobre AsyncStorage) | currency display + usdType |
| Server state | TanStack Query 5 (+ `query-async-storage-persister`) | cache 5 min, persistor 24 h |
| IA | Claude vía Edge Function — `claude-sonnet-4-6` | migrado sesión 5 (ambos edges) |
| OTA | EAS Update (`expo-updates`) | `runtimeVersion.policy=appVersion`, channels dev/preview/production |
| Cotizaciones | dolarapi.com + data912.com (BYMA) | sin auth |
| Tests | `bun test` (lógica) · Playwright/KATA en `tests/` (E2E web futuro, sin tocar) | |

**Repo:** `https://github.com/alexleon001/miplatica.git` · **Org Supabase:** `alexleon001` (`lfzwokjsazkhznvyvzbk`)
**Project URL:** `https://jgszdxqhrbpfjqtqqlpw.supabase.co` · **EAS projectId:** `1740d928-8419-49ff-9875-80fd4376a6ea` (owner `alexleon001`)

---

## Estado actual (sesión 4, 2026-05-29)

Sprints 0 → 3, 5 y 6 completos; 3.5 (inflación) ✅; 4 parcial (CSV ✅, MP OAuth bloqueado por credenciales del user). Todo en `main`.
**Verificado en device (Expo Go):** Sprints 0 → 1 (auth, onboarding, dashboard, toggles, tasas). El resto **no se validó en device aún**.
**APK preview:** build `fa3d3965` (sesión 4 completa + **Mercado Pago**; incluye `expo-web-browser`) **corriendo/recién buildeado** — estado/descarga en https://expo.dev/accounts/alexleon001/projects/mi-platica/builds. Previos: `ad6d2dee` (sesión 4 sin MP), `2a8ddb8c` (sesión 3), `11dda3ab` (primer OK con anon key).

**Qué existe hoy (features):**
- **Dashboard** multi-moneda: `NetWorthCard`, `AccountsList`, `ExchangeRatesBar`, `CurrencyToggle`, pull-refresh, skeletons, estados de error con reintento.
- **Onboarding** (4 campos) con gate por `profile.name is null`; sincroniza currency store con el profile.
- **Movimientos**: lista + resumen mensual + filtros + FAB; alta con flujo IA ("✨ Sugerir categoría"); optimistic insert con rollback.
- **Inversiones**: 10 instrumentos tipados (`lib/instruments.ts` + `deriveInvestmentValues`), distribución, P&L, cotización live por ticker.
- **Deudas**: alta/edición/borrado, resta al patrimonio neto.
- **Metas de ahorro (Sprint 6)**: `savings_goals` CRUD (`SavingsGoalsList` en `more.tsx` + modal `add-goal`), barra de progreso + ETA por aporte mensual. No entra al patrimonio neto.
- **Recordatorios de vencimiento (Sprint 6)**: `lib/reminders.ts` (lógica pura) → banner in-app `UpcomingReminders` en el dashboard (vencidos + ≤14 días) + **notificaciones locales** (`expo-notifications`, hook `useRemindersSync` en el layout de tabs: agenda el día previo 09:00, reprograma al cambiar datos). Cubre deudas (`next_payment_date`) y metas (`target_date`).
- **Rendimiento real / ajuste por inflación (Sprint 3.5, regla #5)**: tabla `inflation` (IPC mensual INDEC vía argentinadatos, 998 meses backfilleados) + Edge `fetch-inflation` (cron días 4 y 17) + hook `useInflation` (self-healing) + helpers puros `lib/inflation.ts` (`cumulativeInflation` compone mes a mes, `realReturn` Fisher, `realReturnForPosition`). `PnLBadge` muestra **"real +Y%"** bajo el % nominal (por posición y agregado del portafolio). El real se mide **en pesos**: nominal ARS de `profit_loss_ars` vs inflación acumulada desde `purchase_date ?? created_at`. Si no hay IPC cargado, oculta el real.
- **Proyección de pagos / cash-flow (Sprint 5)**: el "Excel de proyección" mejorado. Tablas `projection_items` (gasto cargado 1 vez con recurrencia: `monthly`/`installments`/`once` + `payment_method` como grupo) + `projection_income` (override de ingreso por mes; default = `profile.monthly_income_ars`). Lógica pura `lib/projection.ts` (`buildProjection` arma la grilla mes×ítem agrupada por medio de pago con subtotales + TOTAL + neto Deuda/Ganancia; `debtToProjItem` inyecta las deudas activas con cuota — `installments` = ceil(saldo/cuota) — sin recargarlas). UI `app/projection.tsx` (entry en `more.tsx` → ruta `projection`): tira horizontal de meses con el neto (rojo/verde) + detalle del mes (grupos, cuotas `k/N`, ingreso editable). Modales `add-projection-item` + `set-income`. Multi-moneda vía MEP (regla #1). **No validado en device.**
- **Presupuestos vivos**: `budgets.spent_ars` mantenido por triggers; modal de alta.
- **Import CSV de brokers** (pegar texto): parser sin deps + dedup por `external_id`.
- **Asesor financiero IA (Sprint 5)**: chat `app/advisor.tsx` (entry en `more.tsx`) → Edge `financial-advisor` (persona AR + prompt caching + contexto financiero vía RLS) → `use-advisor`.
- **CRUD completo**: borrar las 4 entidades (long-press); editar las 4 (tap = editar, reusan su modal de alta en modo edición; investments re-deriva con `deriveInvestmentValues`).
- **Branding/UI**: ícono de app + adaptive + splash (gradiente indigo→cyan + "$", generados con `scripts/gen-icons.py` vía PIL → `assets/`). Tabs con íconos Ionicons (`@expo/vector-icons`), sin header redundante; todas las tabs con safe-area `top`; wordmark "Mi Platica" en el dashboard.
- **Calidad**: 42 tests `bun test` (verde) sobre `csv.ts`, `broker-import.ts`, `instruments.ts`, `reminders.ts`, `inflation.ts`, `prices.ts`, `projection.ts`. `type-check:app` **limpio** (sesión 4: arreglado tuple `segments[1]` en `_layout.tsx` + excluidos del tsconfig de la app los dirs KATA `api/`/`cli/`/`config/`/`scripts/`, ya cubiertos por `tsconfig.test.json`). `type-check:test` tiene errores KATA pre-existentes (falta dep `allure-js-commons`), ajenos a la app.

**Backend live:** ver "Integraciones activas". Migraciones aplicadas hasta `0005`. Crons activos.

---

## Próxima sesión (sesión 5) — plan

**✅ 2 hallazgos de MP — RESUELTOS (sesión 5, `mp-sync-movements` v2 ACTIVE):**

1. **Saldo de MP.** `fetchBalance()` pega a `GET /users/{mp_user_id}/mercadopago_account/balance` (mp_user_id guardado + access_token) y setea `accounts.balance_amount` + `balance_updated_at` de la cuenta MP. Best-effort (si falla, el sync de pagos sigue y reintenta el balance la próxima). Lee defensivo `available_balance ?? total_amount ?? balance ?? unwithdrawn_balance`; **la respuesta del sync ahora devuelve `balance`** → verificar el shape real en la primera corrida en device. El patrimonio ya lo toma de `v_net_worth.accounts_ars` (suma `balance_amount`).
2. **Duplicados.** `ensureMpAccount` ahora reusa **cualquier** cuenta del user con nombre tipo "mercado pago" (ilike, case/espacios-insensitive), sin importar `integration_type`; prioriza la `api`, y si adopta una manual la promueve a `api`/`connected`. Ya no crea cuentas nuevas si existe una. **Limpieza hecha:** se borró la cuenta manual vacía duplicada (`85cd2b9d`, 0 tx/0 balance); queda solo la `api` `8d354a5c` (100 tx).

> ⚠️ **Balance vuelve `null` (sin resolver).** Primera corrida del cron: `synced:1, inserted:1, balance:null`. El endpoint `/users/{id}/mercadopago_account/balance` o no está autorizado por scope/permiso, o devuelve un shape distinto a los campos que parseo. Como los logs HTTP no muestran el `console`, instrumenté **`mp-sync-movements` v3** para devolver `balance_debug` (`{status, sample, mp_user_id}`) **solo al dueño** (es JWT). **Próximo paso:** tocar "Sincronizar ahora" en el APK y mirar `balance_debug` en la respuesta → ahí se ve el status real (401/403/404 = scope/endpoint; o las keys del body = ajustar el campo a parsear). Recién con eso se arregla el parseo o se cambia de endpoint.
> ⏳ **Falta validar en device:** "Sincronizar ahora" → `balance_debug` (diagnóstico del saldo) + una sola cuenta MP + pagos en Movimientos.

**Cola de deploy de sesión 4 — COMPLETADA:** edges (`update-asset-prices` v4 cripto+coverage, `financial-advisor` v2 inflación) + `ANTHROPIC_API_KEY` seteada + MP backend live (migración `0007` + 3 edges + 4 secrets) + push + APK `fa3d3965` (sesión 4 + MP) buildeado e instalado. **Falta validar en device:** IA (asesor/sugerir categoría con la key), camino feliz general, y los 2 fixes de MP de arriba.

**Opciones priorizadas (elegir al arrancar):**

1. **🔴 Validación en device + fix de bugs (recomendado primero).** Casi nada post-Sprint 1 se probó en device. Camino feliz completo en el APK: alta/edición/borrado de las 4 entidades, import CSV, presupuestos vivos, portafolio, asesor IA (con la key), banner + notificación de recordatorios. Anotar y arreglar lo que rompa. *Es el mayor riesgo acumulado.*

2. ~~📈 Ajuste por inflación en P&L (Sprint 3.5)~~ ✅ **HECHO sesión 4** (tabla `inflation` + Edge + cron + `useInflation` + `realReturnForPosition` + `PnLBadge` con real). Falta **verificar en device** que el "real +Y%" se vea bien y los números cierren.

3. **🛡️ Observabilidad — Sentry (`@sentry/react-native`).** Antes del primer beta real: capturar crashes del cliente + errores de Edge Functions (hoy el scheduling de notifs y los flujos de IA fallan en silencio). ~5k errores/mes gratis.

4. **🔌 Resiliencia de fuentes de precios.** ✅ **HECHO y deployado sesión 4**: `update-asset-prices` (v4) suma **cripto USD vía CoinGecko** (21 tickers; cerraba un hueco — data912 no trae cripto), **loguea/devuelve `coverage` por fuente**, y la UI **marca precios stale** (`lib/prices.ts` + badge en `InvestmentRow` por `last_updated`). Desvío del plan: CoinGecko en vez de criptoya (criptoya es por-exchange/ARS, no encaja con el modelo USD del app). **Falta (diferido):** FCI/CAFCI (API indocumentada/frágil).

**Mejoras chicas (si sobra tiempo):**
- ~~Acción "Aportar" en metas y "Registrar pago" en deudas~~ ✅ **HECHO sesión 4** (`useRegisterDebtPayment`/`useAddGoalContribution` + modal `quick-amount` + píldoras "Pagar"/"+ Aportar"). Falta verificar en device.
- ~~Deep-link al tocar una notificación de recordatorio~~ ✅ **HECHO sesión 4** (listener en `useRemindersSync`: deuda→tab Deudas, meta→Más; cubre app cerrada vía `getLastNotificationResponseAsync`). Falta verificar en device.
- ~~Vista SQL `v_portfolio_by_type` (mover la agregación client-side de `PortfolioDistribution`)~~ ✅ **HECHO sesión 5** (migración `0008` + hook `usePortfolioByType` + `PortfolioDistribution` sin prop; invalidación `["portfolio"]` en mutations de inversiones). Tabla `investments` vacía → no validado con datos reales, pero lógica testeada con datos sintéticos (pct suma 100%, excluye valor 0). Nota: la vista usa `current_value_ars` guardado; el freshening de plazo fijo no se refleja (atraso de interés de ~1 día, despreciable para %).
- Auth social (Google/Apple) para bajar fricción de signup.

**Bloqueado por credenciales del user:** Sprint 4 — Mercado Pago OAuth (`MP_CLIENT_ID`/`MP_CLIENT_SECRET`/`MP_REDIRECT_URI`).

---

## 🛠️ Build del APK (EAS)

**Estado (2026-05-29):** `eas init` ya corrido — `app.json` tiene `projectId`, `owner`, `updates.url` y `runtimeVersion`; `expo-updates ~29` reinstalado. **APK preview buildeado y verificado** (build `11dda3ab`). El blocker que impedía un APK funcional era que faltaba `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el environment `preview` de EAS (el `eas.json/env` solo tenía URL + APP_ENV) → sin ella el APK compila pero no conecta a Supabase. **Ya seteada** (publishable, `eas env`). Perfil `preview` → `buildType: apk`. Build corre en servidores EAS (no requiere Android SDK local).

**Sesión 5 (2026-05-29):** el rebuild de APK se **rechazó por cuota** (plan Free EAS agotó los builds Android del mes; resetea **2026-06-01**). Como los cambios de sesión 5 (proyección, fixes MP, etc.) son **JS/RN puro sin módulos nativos nuevos**, se entregaron por **EAS Update (OTA)** al canal `preview` (runtime `0.1.0`, update group `d7913cc0`, commit `cca8bf7`) → el APK `fa3d3965` instalado los levanta al reabrir. **Rebuild de APK pendiente para después del 1/6** (o upgrade de plan). EAS auth: sesión guardada de `alexleon001` (no hay `EXPO_TOKEN` en el entorno; `eas whoami` OK).

Para rebuildear (con `EXPO_TOKEN` en el entorno corre no-interactivo):
```bash
pnpm dlx eas-cli build -p android --profile preview --non-interactive
# log/descarga: https://expo.dev/accounts/alexleon001/projects/mi-platica/builds
```
Si se cambia la anon key: `eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_... --visibility plaintext --type string`.

Notas: el APK pega a Supabase **productivo**. Ícono/splash por default (cosméticos). "Sugerir IA" / asesor necesitan `ANTHROPIC_API_KEY` en secrets. `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_APP_ENV` vienen del bloque `env` de `eas.json/preview`.

---

## Variables de entorno

| Variable | Dónde | Estado |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | cliente `.env` + `eas.json/preview env` | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | cliente `.env` + EAS env `preview` | ✅ (publishable `sb_publishable_...`) |
| `EXPO_PUBLIC_APP_ENV` | cliente `.env` + `eas.json/preview env` | ✅ |
| `ANTHROPIC_API_KEY` | **Edge Functions** (`supabase secrets set`) | ⚠️ **pendiente del user** (bloquea IA) |
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` / `MP_REDIRECT_URI` / `MP_TOKEN_KEY` | **Edge Functions** | ✅ seteados; migración + 3 edges live. Falta validar el flujo en device (APK `fa3d3965`) |

> Regla #2: API keys sensibles **JAMÁS** en el cliente. Solo la anon publishable (diseñada para exponerse) viaja al bundle.

Setear la key de IA (lo corre el user, login interactivo):
```bash
bunx supabase login && bunx supabase link --project-ref jgszdxqhrbpfjqtqqlpw
bunx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Mercado Pago — estado del setup

✅ **Backend live** (hecho): app MP creada, Redirect URI registrado
(`https://jgszdxqhrbpfjqtqqlpw.supabase.co/functions/v1/mp-oauth-callback`),
4 secrets seteados (`MP_CLIENT_ID`/`MP_CLIENT_SECRET`/`MP_REDIRECT_URI`/`MP_TOKEN_KEY`),
migración `0007` aplicada, 3 edges deployadas.

⏳ **Falta:** validar el flujo en device con el APK `fa3d3965` (tocar "Conectar
Mercado Pago" en Más → autorizar → "Sincronizar ahora" → ver pagos en Movimientos).

Gotchas para debug si algo falla en el device:
- El **Redirect URI** debe coincidir EXACTO con el secret `MP_REDIRECT_URI` y con lo registrado en la app de MP (si no, MP rechaza el `code`).
- Las credenciales de MP son de **producción** (pegan a la cuenta real). Para sandbox: credenciales de prueba + usuarios de test.
- Si `MP_TOKEN_KEY` cambia, las conexiones guardadas dejan de descifrarse (hay que reconectar).
- (Opcional a futuro) cron para `mp-sync-movements` — hoy el sync es manual (botón).

> Recordá: trae **pagos recibidos** (cobrador), no la billetera personal completa.

---

## Decisiones técnicas clave

1. **Convivir Expo + Playwright** en el mismo repo (Playwright queda en `tests/` para E2E web futuro).
2. Supabase región `sa-east-1` (latencia AR).
3. **Publishable keys** (`sb_publishable_...`), no legacy anon JWT.
4. Edge Functions `verify_jwt: true` por defecto; cron/webhooks públicos explícitos (`fetch-exchange-rates`, `update-asset-prices`) con `verify_jwt=false`.
5. **Zustand** (currency display + usdType) con `persist`; **TanStack Query** con persistor AsyncStorage (24 h) por conectividad AR inconsistente.
6. **Optimistic updates con rollback** en mutations de uso diario.
7. **Vistas SQL con `security_invoker=on`** (`v_net_worth`, `v_monthly_balance`) → RLS de tablas underlying aplica solo.
8. **`tsconfig` split**: raíz extiende `expo/tsconfig.base` (app/lib/components); `tsconfig.test.json` para KATA/Playwright. Scripts `type-check:app` / `type-check:test`.
9. **Prompt caching** en Edge Functions de IA (system prompt con `cache_control: ephemeral`).
10. **Categorías como diccionario tipado** (`lib/categories.ts`), no enum DB; el modelo IA solo devuelve IDs de `CATEGORY_IDS`.
11. **`metro.config.cjs`** con `unstable_enableSymlinks`+`unstable_enablePackageExports` para que Metro resuelva symlinks de pnpm. Extensión `.cjs` porque `package.json` es `"type": "module"`.

---

## Integraciones activas

- [x] Proyecto Supabase `mi-platica` (`sa-east-1`). 9 tablas + RLS + triggers (auto-profile, set_updated_at).
- [x] Vistas `v_net_worth`, `v_monthly_balance` (`security_invoker=on`).
- [x] Auth Supabase (email+password) vía `lib/supabase.ts` + `lib/auth.tsx` + `use-profile.ts`.
- [x] Edge `fetch-exchange-rates` (ACTIVE, `verify_jwt=false`) → dolarapi → `exchange_rates`. Self-healing client-side.
- [x] Edge `categorize-transaction` (ACTIVE, `verify_jwt=true`, prompt caching). ⚠️ Sin `ANTHROPIC_API_KEY` → 500.
- [x] Edge `financial-advisor` (ACTIVE, `verify_jwt=true`, prompt caching, **v2**). Arma contexto del user vía RLS, ahora con **contexto de inflación** (IPC mensual + acum. 3m/12m) + **rendimiento real por posición en pesos** (consistente con `realReturnForPosition`). ⚠️ Sin `ANTHROPIC_API_KEY` → 500 (el user la está seteando).
- [x] Edge `update-asset-prices` (ACTIVE, `verify_jwt=false`, **v4**) → data912 + **CoinGecko (cripto, 21 tickers)** + dolarapi → `asset_prices`. Devuelve/loguea `coverage` por fuente. Llama `refresh_positions()` por RPC al final.
- [x] Edge `fetch-inflation` (ACTIVE, `verify_jwt=false`) → argentinadatos → `inflation` (IPC mensual, upsert idempotente). 998 meses backfilleados.
- [x] Función SQL `refresh_positions()` (migración `0003`, `security_definer`, revaloriza posiciones).
- [x] pg_cron: `update-asset-prices` (`*/15 14-20 * * 1-5`) + `fetch-exchange-rates` (`*/30 * * * *`) + `fetch-inflation` (`0 14 4,17 * *`) + **`mp-sync-cron` (`0 */6 * * *`)**, vía `net.http_post` keyless. Probados.
- [x] Edge `mp-sync-cron` (ACTIVE, `verify_jwt=false`, **v1**) → itera todas las `mp_connections` con service_role y sincroniza saldo+pagos de cada una (misma lógica que `mp-sync-movements`, duplicada a propósito). Anti-abuso: saltea conexiones sincronizadas hace < 30 min. Smoke-test OK (1 conexión, 1 pago insertado).
- [x] Import CSV de movimientos (Cocos/PPI/IOL/banco) por alias de columnas + dedup `external_id`.
- [ ] **`ANTHROPIC_API_KEY`** en secrets — bloquea IA.
- [x] **Mercado Pago OAuth — backend LIVE (Sprint 4).** Migración `0007` aplicada + 3 edges ACTIVE (`mp-oauth-start` v1 jwt, `mp-oauth-callback` v1 público, `mp-sync-movements` v1 jwt) + 4 secrets seteados (CLIENT_ID/SECRET/REDIRECT_URI/TOKEN_KEY). Verificado: callback 302 OK, pgcrypto round-trip OK. Cliente: `use-mp.ts` + `MercadoPagoConnect` en `more.tsx` (`expo-web-browser`). Trae pagos RECIBIDOS (cobrador), no billetera personal. **Falta: validar el flujo completo en device** (APK `fa3d3965`, que ya incluye `expo-web-browser`). Sync manual (botón); cron opcional a futuro.
- [ ] CAFCI (FCI) y cripto: sin fuente de precios aún. Open Banking BCRA — eval Sprint 5+.

**Migraciones aplicadas:** `0001_init_schema`, `0002_helper_views`, `0003_refresh_positions`, `0004_schedule_crons`, `0005_budget_spent_triggers`, `0006_inflation`, `0007_mp_connections` (mp_connections cifrada con pgcrypto + mp_oauth_states + funciones `mp_store_connection`/`mp_get_tokens` con `search_path = public, extensions` — pgcrypto vive en `extensions` en Supabase), `0008_portfolio_by_type` (vista `v_portfolio_by_type` con `security_invoker=on` — agrega valor/% por tipo de instrumento), `0009_payment_projection` (`projection_items` + `projection_income` con RLS owner-only + triggers updated_at — proyección de cash-flow), `0010_schedule_mp_sync_cron` (pg_cron `mp-sync-cron` cada 6 h).

---

## Deuda técnica

- **`expo-updates` reactivado** (post `eas init`): `app.json` tiene `updates.url` + `runtimeVersion`, dep `~29` instalada (cambios sin commitear). Expo Go ignora expo-updates, pero un dev/preview build sí lo usa. Antes causaba crash al boot (`IOException`) cuando `updates.url` apuntaba a endpoint inexistente; **ahora la URL es real**, así que debería estar OK — **verificar el boot del APK en device**.
- **Validación en device incompleta:** solo Sprints 0→1 probados en Expo Go. Resto de sesión 2 sin validar (ojo navegación post expo-router 6).
- ~~`claude-sonnet-4-5-20250929` → migrar a `claude-sonnet-4-6` cuando GA~~ ✅ **HECHO sesión 5**: ambos edges de IA en `claude-sonnet-4-6` (`categorize-transaction` v7, `financial-advisor` v8).
- **`update-asset-prices` depende de data912.com** (gratuita, no oficial, sin SLA) para acciones/CEDEARs/bonos/ON; cripto vía CoinGecko; MEP vía dolarapi. Si cambia el shape de data912, ajustar `SOURCES`/`normalize`. **FCI sin fuente** (CAFCI diferido). Sin Sentry. (Edge deployada v4 — cripto + coverage live.)
- **Plazo fijo (interés devengado):** ✅ resuelto client-side — `freshenPlazoFijo` (en `use-investments.ts`) recalcula `current_value_*`/`profit_loss_*` al vuelo con la fecha de hoy (reusa `deriveInvestmentValues`). Aplicado en Inversiones (lista/resumen) **y en el dashboard** vía `useFreshNetWorth` (la distribución ahora sale de la vista `v_portfolio_by_type` con el valor guardado — atraso despreciable para %) (ajusta el patrimonio por el delta de devengado). El valor guardado en DB se sincroniza recién al correr el cron, pero la UI ya muestra el devengado al día.
- **Android SDK local no instalado** → `pnpm android` falla. Usar Expo Go (QR) o EAS Build remoto.
- **Íconos de app:** `assets/icon.png` + `adaptive-icon.png` + `splash-icon.png` generados con `scripts/gen-icons.py` (PIL, gradiente + "$"). Placeholder de marca decente; reemplazar por un diseño definitivo antes del store si se quiere.
- **Sin Sentry/observability.** Errores de cliente y Edge Functions no se reportan.
- **`type-check` corre dos `tsc` en serie** (app+test). Lento en CI eventual.
- **`CLAUDE.boilerplate.md` + `tests/` (KATA/Playwright)** intactos, no apuntan a la app. Archivar si no se usan, o adaptar para tests web del panel admin futuro.

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
9. **No push a `main` sin OK explícito.**
10. **Sin AI attribution** en commits.
11. **Rol proactivo:** al cierre de cada sprint, proponer 2–4 mejoras.
12. **Commits van con `git commit --no-verify`** (el hook lint-staged/@antfu es de KATA y no aplica al app Expo).

---

## Workflow de sprints

| Sprint | Foco | Estado |
|---|---|---|
| 0 / 0.5 | Setup, auth, edge rates / type-safety, OTA, currency store, TanStack Query | ✅ |
| 1 / 1.5 | Dashboard multi-moneda / onboarding + sync profile | ✅ |
| 2 | Transacciones + categorización IA + presupuestos | ✅ |
| 3 | Portafolio con cotizaciones live | ✅ (backend+crons live; falta verificar UI en device) |
| 3.5 | Ajuste por inflación / rendimiento real (regla #5) | ✅ (tabla `inflation` + Edge `fetch-inflation` + cron + `useInflation` + `PnLBadge` real; falta verificar en device) |
| 4 | Mercado Pago + import CSV | ✅ CSV + MP OAuth (backend live: migración 0007 + 3 edges + secrets; falta validar flujo en device en APK `fa3d3965`) |
| 5 | Asesor financiero IA | ✅ (Edge `financial-advisor` + chat; falta `ANTHROPIC_API_KEY` + probar en device) |
| 6 | Deudas, metas y presupuestos avanzados | ✅ deudas + presupuestos vivos + metas de ahorro + recordatorios de vencimiento (in-app + notif locales) |

*Última actualización: 2026-05-29 (sesión 4): rendimiento real / ajuste por inflación (Sprint 3.5) — tabla `inflation` + Edge `fetch-inflation` + cron + `useInflation` + `PnLBadge` con "real +Y%". Historial detallado por sprint en el git log.*
