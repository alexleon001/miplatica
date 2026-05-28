# Mi Platica — Estado del Proyecto

> App móvil de finanzas personales con IA, foco Argentina (ARS/USD, inflación, MEP/Blue/CCL, FCI, CEDEARs, plazos fijos).
> Tagline: *"Tus finanzas, con inteligencia argentina"*

---

## Stack confirmado

| Capa | Tecnología | Versión / Notas |
|---|---|---|
| App móvil | React Native + Expo + Expo Router | SDK por instalar en Sprint 0 |
| Lenguaje | TypeScript | 5.8+ (strict) |
| Runtime / Package manager | Bun | 1.x (heredado del boilerplate KATA) |
| Backend | Supabase (Postgres 17 + Auth + Edge Functions + Storage) | proyecto `mi-platica` a crear en `sa-east-1` |
| IA | Claude Sonnet 4.6 vía Edge Functions | `claude-sonnet-4-6` |
| Tests E2E (futuro) | Playwright + KATA | heredado del boilerplate, sin tocar |
| Cotizaciones | dolarapi.com (gratis), CAFCI, BYMA | sin auth |

**Repo:** `https://github.com/alexleon001/miplatica.git`

---

## Sprint actual

**Sprint 0 — Setup y estructura**

Objetivo: proyecto corriendo en Expo Go con navegación a 5 tabs, Supabase conectado, auth funcional y primera Edge Function desplegada.

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

## Próxima tarea

**Sprint 1 — Dashboard Patrimonial multi-moneda**

1. Hooks: `useAccounts()`, `useNetWorth()` (con cache TanStack Query).
2. Componente `NetWorthCard` (patrimonio total ARS + USD, variación 30d).
3. Componente `MoneyAmount` reusable (consume `useCurrencyStore`).
4. Sección "Mis cuentas" con lista (`accounts`) y CTA "+ Agregar cuenta".
5. Modal `add-account.tsx` (cuenta manual: name, type, currency, balance inicial).
6. Sección "Tipo de cambio actual" con todos (oficial/MEP/blue/CCL) — useExchangeRates ya existe.

**Operativo (usuario):**
- `bun install` para resolver deps Expo/Supabase/Zustand/TanStack Query/expo-updates.
- `bunx expo install --check` para alinear versiones SDK.
- `bun start` → QR con Expo Go → probar signup/signin y CurrencyToggle.
- (Una vez): `bunx eas-cli login` + `bunx eas-cli init` + `bunx eas update:configure` para completar `updates.url` en app.json.
- Configurar pg_cron en Supabase Dashboard para invocar `fetch-exchange-rates` cada 30 min.
- (Opcional) `bunx supabase login` para habilitar `bun run db:types`.

---

## Variables de entorno requeridas

| Variable | Dónde | Sprint en que se introduce |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | cliente (app) | Sprint 0 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | cliente (app) | Sprint 0 |
| `ANTHROPIC_API_KEY` | **solo Edge Functions** (`supabase secrets set`) | Sprint 2 |
| `MP_CLIENT_ID` | **solo Edge Functions** | Sprint 4 |
| `MP_CLIENT_SECRET` | **solo Edge Functions** | Sprint 4 |

> Regla #2 del super prompt: API keys **JAMÁS** en el cliente. Todo lo sensible vive en Edge Functions / Supabase secrets.

---

## Decisiones técnicas tomadas

| # | Decisión | Razón |
|---|---|---|
| 1 | Convivir Expo + Playwright en el mismo repo | Usuario pidió misma carpeta y reutilizar lo que sirva. Playwright se mantiene para E2E web futuro (panel admin, edge functions). |
| 2 | Región Supabase = `sa-east-1` (São Paulo) | Latencia óptima para usuarios AR. |
| 3 | Usar **publishable keys** (`sb_publishable_...`), no legacy anon JWT | Mejor seguridad y rotación independiente (recomendación oficial Supabase). |
| 4 | Edge Functions con `verify_jwt: true` por defecto | Toda función requiere usuario auth, salvo cron/webhooks explícitamente públicos. |
| 5 | Naming del proyecto: `mi-platica` (kebab-case) | Convención Supabase. |
| 6 | `claude-sonnet-4-6` para IA | Per super prompt; balance costo/calidad para categorización + asesor. |
| 7 | Tipos de cambio: `dolarapi.com`, sin auth, cron 30 min | Suficiente para v1; sin scraping. |

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

- [x] **Proyecto Supabase `mi-platica`** creado en `sa-east-1` (id `jgszdxqhrbpfjqtqqlpw`, URL `https://jgszdxqhrbpfjqtqqlpw.supabase.co`).
- [x] **Migración `init_schema`** aplicada — 9 tablas + RLS + triggers (auto-profile, set_updated_at).
- [x] **Auth Supabase** (email + password) cableada vía `lib/supabase.ts` + `lib/auth.tsx`.
- [x] **Edge Function `fetch-exchange-rates`** desplegada (v1, ACTIVE, `verify_jwt=false` para cron).
- [ ] **pg_cron** que invoque la edge function cada 30 min — pendiente config en Dashboard.
- [ ] Mercado Pago OAuth — Sprint 4
- [ ] BYMA / CAFCI — Sprint 3
- [ ] CSV Cocos Capital — Sprint 4
- [ ] CSV Portfolio Personal — Sprint 4
- [ ] Open Banking BCRA — eval Sprint 5+

---

## Deuda técnica

- `CLAUDE.boilerplate.md` queda como referencia; cuando el equipo defina si Playwright/KATA se usará para algún panel web futuro, decidir si extraer o eliminar.
- `package.json` aún declara nombre `kata-playwright-boilerplate`. Pendiente renombrar a `mi-platica` (se hace en el commit de Sprint 0).
- `.gitignore` necesita bloques para artefactos Expo (`.expo/`, `dist/`, `web-build/`) — se agrega en Sprint 0.

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
| 1 | Dashboard patrimonial multi-moneda | 🚧 próximo |
| 2 | Transacciones + categorización IA + presupuestos | ⏳ |
| 3 | Portafolio de inversiones con cotizaciones live | ⏳ |
| 4 | Integración Mercado Pago + import CSV brokers | ⏳ |
| 5 | Asesor financiero IA (chat con contexto completo) | ⏳ |
| 6 | Deudas, metas y presupuestos avanzados | ⏳ |

---

*Actualizar al cierre de cada sprint o tarea relevante. Última actualización: 2026-05-28.*
