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
| IA | Claude vía Edge Function — `claude-sonnet-4-5-20250929` | migrar a sonnet-4-6 cuando esté GA |
| OTA | EAS Update (`expo-updates`) | `runtimeVersion.policy=appVersion`, channels dev/preview/production |
| Cotizaciones | dolarapi.com + data912.com (BYMA) | sin auth |
| Tests | `bun test` (lógica) · Playwright/KATA en `tests/` (E2E web futuro, sin tocar) | |

**Repo:** `https://github.com/alexleon001/miplatica.git` · **Org Supabase:** `alexleon001` (`lfzwokjsazkhznvyvzbk`)
**Project URL:** `https://jgszdxqhrbpfjqtqqlpw.supabase.co` · **EAS projectId:** `1740d928-8419-49ff-9875-80fd4376a6ea` (owner `alexleon001`)

---

## Estado actual (sesión 3, 2026-05-29)

Sprints 0 → 3 y 5 completos; 4 parcial (CSV ✅, MP OAuth bloqueado); 6 parcial (deudas + presupuestos vivos). Todo en `main`.
**Verificado en device (Expo Go):** Sprints 0 → 1 (auth, onboarding, dashboard, toggles, tasas). El resto **no se validó en device aún**.
**APK preview buildeado y verificado** vía EAS (build `11dda3ab`, 2026-05-29) con la anon key cargada.

**Qué existe hoy (features):**
- **Dashboard** multi-moneda: `NetWorthCard`, `AccountsList`, `ExchangeRatesBar`, `CurrencyToggle`, pull-refresh, skeletons, estados de error con reintento.
- **Onboarding** (4 campos) con gate por `profile.name is null`; sincroniza currency store con el profile.
- **Movimientos**: lista + resumen mensual + filtros + FAB; alta con flujo IA ("✨ Sugerir categoría"); optimistic insert con rollback.
- **Inversiones**: 10 instrumentos tipados (`lib/instruments.ts` + `deriveInvestmentValues`), distribución, P&L, cotización live por ticker.
- **Deudas**: alta/edición/borrado, resta al patrimonio neto.
- **Metas de ahorro (Sprint 6)**: `savings_goals` CRUD (`SavingsGoalsList` en `more.tsx` + modal `add-goal`), barra de progreso + ETA por aporte mensual. No entra al patrimonio neto.
- **Presupuestos vivos**: `budgets.spent_ars` mantenido por triggers; modal de alta.
- **Import CSV de brokers** (pegar texto): parser sin deps + dedup por `external_id`.
- **Asesor financiero IA (Sprint 5)**: chat `app/advisor.tsx` (entry en `more.tsx`) → Edge `financial-advisor` (persona AR + prompt caching + contexto financiero vía RLS) → `use-advisor`.
- **CRUD completo**: borrar las 4 entidades (long-press); editar las 4 (tap = editar, reusan su modal de alta en modo edición; investments re-deriva con `deriveInvestmentValues`).
- **Branding/UI**: ícono de app + adaptive + splash (gradiente indigo→cyan + "$", generados con `scripts/gen-icons.py` vía PIL → `assets/`). Tabs con íconos Ionicons (`@expo/vector-icons`), sin header redundante; todas las tabs con safe-area `top`; wordmark "Mi Platica" en el dashboard.
- **Calidad**: 13 tests `bun test` (verde) sobre `csv.ts`, `broker-import.ts`, `instruments.ts`. `type-check:app` limpio.

**Backend live:** ver "Integraciones activas". Migraciones aplicadas hasta `0005`. Crons activos.

---

## Próxima tarea

**1. Setear `ANTHROPIC_API_KEY` en Supabase secrets** (pendiente del user) — desbloquea "Sugerir IA" en add-transaction **y el asesor IA** (ambas Edge Functions devuelven 500 sin la key). Comando abajo en "Variables de entorno".

**2. Validar en device (Expo Go o el APK)** todo lo no probado aún: navegación post expo-router 6, alta/edición/borrado de las 4 entidades, import CSV, presupuestos vivos, portafolio, **chat del asesor IA**.

**3. Sprint 6 (resto):** recordatorios de vencimiento de deudas/metas (push o notificación local). Sprint 3.5: ajuste por inflación en P&L (IPC argentinadatos), vista `v_portfolio_by_type`, resiliencia de fuentes de precios.

**Sprint 4 (resto) — Mercado Pago OAuth:** bloqueado hasta que el user genere `MP_CLIENT_ID`/`MP_CLIENT_SECRET`/`MP_REDIRECT_URI`.

---

## 🛠️ Build del APK (EAS)

**Estado (2026-05-29):** `eas init` ya corrido — `app.json` tiene `projectId`, `owner`, `updates.url` y `runtimeVersion`; `expo-updates ~29` reinstalado. **APK preview buildeado y verificado** (build `11dda3ab`). El blocker que impedía un APK funcional era que faltaba `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el environment `preview` de EAS (el `eas.json/env` solo tenía URL + APP_ENV) → sin ella el APK compila pero no conecta a Supabase. **Ya seteada** (publishable, `eas env`). Perfil `preview` → `buildType: apk`. Build corre en servidores EAS (no requiere Android SDK local).

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
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` / `MP_REDIRECT_URI` | **Edge Functions** | ⏳ Sprint 4 |

> Regla #2: API keys sensibles **JAMÁS** en el cliente. Solo la anon publishable (diseñada para exponerse) viaja al bundle.

Setear la key de IA (lo corre el user, login interactivo):
```bash
bunx supabase login && bunx supabase link --project-ref jgszdxqhrbpfjqtqqlpw
bunx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

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
- [x] Edge `financial-advisor` (ACTIVE, `verify_jwt=true`, prompt caching). Arma contexto del user vía RLS. ⚠️ Sin `ANTHROPIC_API_KEY` → 500.
- [x] Edge `update-asset-prices` (ACTIVE, `verify_jwt=false`) → data912 + dolarapi → `asset_prices`. Llama `refresh_positions()` por RPC al final.
- [x] Función SQL `refresh_positions()` (migración `0003`, `security_definer`, revaloriza posiciones).
- [x] pg_cron: `update-asset-prices` (`*/15 14-20 * * 1-5`, jobid 1) + `fetch-exchange-rates` (`*/30 * * * *`, jobid 2), vía `net.http_post` keyless. Probados.
- [x] Import CSV de movimientos (Cocos/PPI/IOL/banco) por alias de columnas + dedup `external_id`.
- [ ] **`ANTHROPIC_API_KEY`** en secrets — bloquea IA.
- [ ] Mercado Pago OAuth — Sprint 4.
- [ ] CAFCI (FCI) y cripto: sin fuente de precios aún. Open Banking BCRA — eval Sprint 5+.

**Migraciones aplicadas:** `0001_init_schema`, `0002_helper_views`, `0003_refresh_positions`, `0004_schedule_crons`, `0005_budget_spent_triggers`.

---

## Deuda técnica

- **`expo-updates` reactivado** (post `eas init`): `app.json` tiene `updates.url` + `runtimeVersion`, dep `~29` instalada (cambios sin commitear). Expo Go ignora expo-updates, pero un dev/preview build sí lo usa. Antes causaba crash al boot (`IOException`) cuando `updates.url` apuntaba a endpoint inexistente; **ahora la URL es real**, así que debería estar OK — **verificar el boot del APK en device**.
- **Validación en device incompleta:** solo Sprints 0→1 probados en Expo Go. Resto de sesión 2 sin validar (ojo navegación post expo-router 6).
- **`claude-sonnet-4-5-20250929`** en `categorize-transaction` (y futuro `financial-advisor`) → migrar a `claude-sonnet-4-6` cuando GA (cambiar const `MODEL` + redeploy).
- **`update-asset-prices` depende de data912.com** (gratuita, no oficial, sin SLA). Si cambia el shape, ajustar `SOURCES`/`normalize`. Sin fallback (CAFCI/criptoya) ni Sentry.
- **Plazo fijo (interés devengado)** solo se actualiza al correr el cron de precios (no al abrir la app) → fuera de horario bursátil puede verse con ~1 día de atraso. Mejora: recalcular client-side al render o cron diario.
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
| 4 | Mercado Pago + import CSV | 🚧 CSV ✅; MP OAuth bloqueado por credenciales del user |
| 5 | Asesor financiero IA | ✅ (Edge `financial-advisor` + chat; falta `ANTHROPIC_API_KEY` + probar en device) |
| 6 | Deudas, metas y presupuestos avanzados | 🚧 deudas ✅ + presupuestos vivos ✅ + metas de ahorro ✅; falta recordatorios de vencimiento |

*Última actualización: 2026-05-29 (sesión 3): asesor IA, edit CRUD completo, metas de ahorro, ícono de app + íconos de tabs, APK rebuildeado. Historial detallado por sprint en el git log.*
