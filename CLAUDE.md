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

## Estado actual (sesión 6, 2026-06-01 — cierre)

> **Cierre sesión 6 (2026-06-01):**
> - **Todo pusheado a `main`** (último commit `983ab28`). El push lo bloquea el clasificador → **lo corre el user**.
> - **APK `de26cdb7`** (canal `preview`, runtime `0.1.0`) buildeado con la cuota EAS reseteada el 1/6 — trae sesión 5 + fix teclado, baked-in. Reemplaza a `fa3d3965`. Descarga: https://expo.dev/accounts/alexleon001/projects/mi-platica/builds/de26cdb7-489e-43c2-9c2c-abac54cd0685
> - **2 OTA al canal `preview` post-APK** (cambios solo-JS): `ac1ba8cb` (asesor persistente) + `a718f78b` (botón categorizar). Se bajan al reabrir la app.
> - **Validado en device:** **asesor IA ✅** (`ANTHROPIC_API_KEY` seteada y responde) — clave para detectar el bug de MP.
> - **🔴 BUG GORDO DE MP RESUELTO:** el sync metía TODOS los pagos como `income`, inflando el patrimonio ~33x ($23,4M falsos) con duplicados/transferencias internas/rendimientos. Diagnóstico vía `?debug=1` en `mp-sync-cron` (disparado por SQL `net.http_post` + leer `net._http_response`). **Fix:** (1) solo `regular_payment` aprobados (excluye `money_transfer`/`investment`/`account_fund`); (2) clasifica por dirección (`collector_id == mp_user_id` → ingreso; si no → **gasto**) + **paginación** (antes solo 100). Resultado real: **187 gastos / 15 ingresos** (la cuenta MP conectada se usa para PAGAR; las ventas del negocio van por otra cuenta que NO está conectada). Datos viejos borrados + re-sync limpio. **mp-sync-cron v7, mp-sync-movements v6.**
> - **Asesor IA — chat persistente:** historial en AsyncStorage (`lib/store/advisor.ts`, store Zustand) → ya no se pierde al salir; botón "Limpiar" para nueva conversación. (v1: una conversación, local por dispositivo.)
> - **Auto-categorización IA (nuevo):** edge **`categorize-batch` v1** (verify_jwt) categoriza en lote los movimientos `category IS NULL` — 1 llamada a Claude por tanda de 50, valida grupo (gasto/ingreso), fallback seguro. UI: banner "N sin categoría · Categorizar con IA" en tab Movimientos (`useCategorizeBatch`). **Falta que el user lo toque** (202 movimientos sin categoría a la fecha) y verificar resultado.
> - **Confirmado:** dólar se actualiza solo (cron `fetch-exchange-rates` cada 30 min + self-healing). Vista USD ya disponible (toggle dashboard + editar perfil) — el user la usa, sin cambios pedidos.
> - **Descartado por el user:** Sentry.
>
---

> **Cierre sesión 7 (2026-06-03):**
> - **Todo pusheado a `main`** (último commit `ff5c1ff`). Commits de la sesión: `361cc02` (design system + refresh visual), `8684b13` (proyección: saldo acumulado + fix bug recurrencia), `aef0290` (FCI), `c82302d` (gradiente real + BrandGradient), `cb19b48` (fix tab bar safe-area + sombras Android), `01bd783` (perf: héroe + gate FCI), `ff5c1ff` (fix banda vacía: edges bottom redundante en tabs).
> - **🆕 APK `c368dc3e`** (canal `preview`, runtime `0.1.0`) — buildeado de `c82302d`, trae todo lo de sesión 7 baked-in **+ `expo-linear-gradient` nativo** (gradiente real). **Reemplaza a `de26cdb7`.** Descarga: https://expo.dev/accounts/alexleon001/projects/mi-platica/builds/c368dc3e-7034-4cfc-acd4-197c2cda6be7
> - **3 OTA al canal `preview` post-APK** (solo-JS, encima de `c368dc3e`): `fee9f3d3` (sesión 7 base), `0463f788` (fix tab bar + perf), `4b37dea0` (fix banda). **⚠️ Los fixes de tab bar/banda/perf SOLO viven en estos OTAs** — el APK `c368dc3e` se buildeó de `c82302d` (antes de esos fixes). Para verlos hay que reabrir la app **2 veces** (1ra baja el OTA, 2da lo aplica) y matar la app de verdad (en MIUI/HyperOS bloquearla en recientes).
> - **Trabajo de la sesión:** (1) **refresh visual completo** (design system `lib/theme.ts`+`components/ui.tsx`+`components/form.tsx`, las 5 tabs + 12 modales + asesor/proyección/login/onboarding); (2) **proyección mejorada** — saldo acumulado proyectado (siembra `accounts_ars`, `accrueFirstMonth=false` deja el mes en curso informativo) + **fix bug**: recurrencia default era `monthly` → gasto puntual se repetía; ahora `once` + preview de alcance; (3) **FCI client-side** (selector de fondos + VCP argentinadatos + freshening); (4) **gradiente real** indigo→cyan (OTA-safe vía `BrandGradient` error boundary).
> - **🔴 Bugs reportados en device (APK `c368dc3e` sin OTA aplicado) y YA ARREGLADOS en OTA:** (a) tab bar se solapaba con los botones del sistema (faltaba `safe-area inset`); (b) banda vacía entre contenido y tabs (doble inset: tab bar + `SafeAreaView edges bottom` en las tabs → se sacó el `bottom`); (c) lag al scrollear dashboard (héroe con overflow+blobs → gradiente pasa a ser la card) y al cambiar de tab (query FCI disparaba al montar → gateada con `enabled`).
>
> **Para arrancar sesión 8:**
> - **🔴 Esperar confirmación del user** (valida mañana 4/6 con el OTA `4b37dea0` aplicado): tab bar sin solapar, sin banda vacía, scroll/tabs fluidos. Si sigue el lag al cambiar de tab → próximo paso: transición + primer render de cada pantalla (aligerar listas / `lazy`).
> - **Validar en device el resto** (nunca probado): selector de FCI con un fondo real, proyección con saldo acumulado + aviso "te quedás sin efectivo en X", fix del gasto puntual que ya no se repite, botón "Categorizar con IA" (202 mov. sin categoría), camino feliz general.
> - **Auth social Google/Apple:** bloqueado hasta credenciales OAuth del user.

> **Cierre sesión 8 (2026-06-04):**
> - **Commits en `main` local (sin pushear — push lo corre el user):** `8673a64` (proyección: botones editar/borrar visibles + auto-split de cuotas), `512ad69` (alertas de presupuesto 80/100%), `f47bd88` (proyección: checklist pagado + compartir + duplicar), `5e3723e` (resumen mensual IA), `649accb` (sparkline de patrimonio). **Falta `git push`.**
> - **Todo OTA-safe (JS puro, sin deps nativas nuevas)** → se puede OTA-ear al canal `preview` sobre el APK `c368dc3e` sin rebuild. **EXCEPCIÓN:** el resumen mensual IA necesita el **edge `monthly-summary` deployado** (ver abajo).
> - **🔴 PENDIENTE deploy del user:** el edge **`monthly-summary` NO está deployado** (lo bloqueó el clasificador: es deploy productivo). Está en `supabase/functions/monthly-summary/index.ts`. Deployar con: `bunx supabase functions deploy monthly-summary` (verify_jwt on; usa `ANTHROPIC_API_KEY` ya seteada). Hasta entonces la pantalla "Resumen del mes" da error al generar.
> - **Features de la sesión (las 4 que pidió el user):**
>   1. **Proyección — cuotas sin interés por total:** al cargar un gasto en cuotas sin interés, ahora se tipea el **total de la compra** + N cuotas y la app reparte (`total/N`); en DB se sigue guardando el **por-cuota** (cero cambios en `lib/projection.ts`). Editar reconstruye el total. Preview "N cuotas de $X c/u". Con interés sigue igual (capital + TNA → francés).
>   2. **Proyección — editar/borrar visible:** botones lápiz/tacho por línea (antes era long-press oculto) + botón limpiar ajuste de ingreso. **Checklist "pagado" por mes** (`lib/store/projection-paid.ts`, local): tap al círculo tacha la línea + fila "Te falta pagar" (el TOTAL queda completo). **Compartir** la proyección como texto (`projectionToText` en `lib/projection.ts` + `Share` nativo). **Duplicar** ítem (ícono copy → modal con `?dup=id`).
>   3. **Alertas de presupuesto:** notificación local al cruzar 80%/100% (`lib/budget-alerts.ts` puro + `lib/hooks/use-budget-alerts.ts`, montado en el layout de tabs). Dedup por `id:level:YYYY-MM` en AsyncStorage; notif inmediata (no la pisa el `cancelAll` de reminders).
>   4. **Resumen mensual IA:** edge `monthly-summary` (agrega gasto por categoría mes actual vs anterior + ingreso + inflación server-side, Claude `claude-sonnet-4-6`, prompt caching) + `use-monthly-summary` (cache 6h) + pantalla `app/monthly-summary.tsx` (entry en `more.tsx`). **Necesita deploy (ver arriba).**
>   5. **Sparkline de patrimonio:** `lib/networth-history.ts` (puro) + `lib/store/networth-history.ts` (snapshot diario local) + `components/NetWorthChart.tsx` (barras con Views puras, **sin react-native-svg → OTA-safe**), bajo el `NetWorthCard`. Respeta el CurrencyToggle; se llena a medida que se abre la app día a día (mín. 2 días).
> - **Tests:** 71 `bun test` verdes (+19 en la sesión: budget-alerts, projectionToText, networth-history). `type-check:app` limpio.
> - **Decisión transversal:** todas las features nuevas que necesitaban persistencia van **local-first** (Zustand+AsyncStorage), evitando migraciones/crons a prod (consistente con asesor/alertas). El único backend nuevo es el edge `monthly-summary`.
>
> **Para arrancar sesión 9:**
> - **🔴 User:** (a) `git push`; (b) deploy `monthly-summary`; (c) OTA al canal `preview` (todo lo demás es JS). Después validar en device las 5 features.
> - Pendientes de sesión 7 siguen abiertos (validación en device del refresh visual, FCI, proyección saldo acumulado, categorizar IA).

Sprints 0 → 3, 5 y 6 completos; 3.5 (inflación) ✅; 4 parcial (CSV ✅, MP OAuth ✅ live — saldo manual); 7 = refresh visual + proyección + FCI + gradiente. Todo en `main` (pusheado hasta `ff5c1ff`).
**Verificado en device (Expo Go):** Sprints 0 → 1. **Sesión 7 (APK `c368dc3e` + OTAs): pendiente de validar** (user confirma 4/6).
**APK preview:** build `c368dc3e` (sesión 7 baked-in + gradiente nativo). Previos: `de26cdb7` (sesión 5 + fix teclado), `fa3d3965` (sesión 4 + MP), `2a8ddb8c` (sesión 3), `11dda3ab` (primer OK con anon key).

**Qué existe hoy (features):**
- **Dashboard** multi-moneda: `NetWorthCard`, `AccountsList`, `ExchangeRatesBar`, `CurrencyToggle`, pull-refresh, skeletons, estados de error con reintento.
- **Onboarding** (4 campos) con gate por `profile.name is null`; sincroniza currency store con el profile.
- **Movimientos**: lista + resumen mensual + filtros + FAB; alta con flujo IA ("✨ Sugerir categoría"); optimistic insert con rollback.
- **Inversiones**: 10 instrumentos tipados (`lib/instruments.ts` + `deriveInvestmentValues`), distribución, P&L, cotización live por ticker.
- **FCI / Fondos comunes (sesión 7, client-side)**: los FCI no tienen ticker → `lib/fci.ts` (puro: `fciSlug`/`filterFunds`/`parseFciRow`) usa un **slug del nombre del fondo** como ticker. `lib/hooks/use-fci-funds.ts` trae la lista de fondos + VCP del día desde **argentinadatos** (`/v1/finanzas/fci/{mercadoDinero|rentaFija|rentaVariable|rentaMixta}/ultimo`, las 4 categorías, dedup por slug, cache 6h, tolerante a fallos por categoría). `components/FundField.tsx` = **selector buscable** (modal full-screen con search + FlatList) que devuelve el `FciFund`. En `add-investment`, si el tipo es FCI: muestra `FundField` (en vez del ticker libre + Moneda), prefilla `name`=fondo, `ticker`=slug, costo=VCP, y muestra el VCP actual. **Sin backend/cron:** el valor se refresca client-side con `freshenFci` (en `use-investments.ts`, mismo patrón que `freshenPlazoFijo`) aplicado en la pantalla Inversiones. **Caveat:** el dashboard/`v_net_worth` usa el valor guardado (VCP de la compra) hasta que el user abra Inversiones — atraso ≤1 día, despreciable. Tests en `lib/fci.test.ts`.
- **Deudas**: alta/edición/borrado, resta al patrimonio neto.
- **Metas de ahorro (Sprint 6)**: `savings_goals` CRUD (`SavingsGoalsList` en `more.tsx` + modal `add-goal`), barra de progreso + ETA por aporte mensual. No entra al patrimonio neto.
- **Recordatorios de vencimiento (Sprint 6)**: `lib/reminders.ts` (lógica pura) → banner in-app `UpcomingReminders` en el dashboard (vencidos + ≤14 días) + **notificaciones locales** (`expo-notifications`, hook `useRemindersSync` en el layout de tabs: agenda el día previo 09:00, reprograma al cambiar datos). Cubre deudas (`next_payment_date`) y metas (`target_date`).
- **Rendimiento real / ajuste por inflación (Sprint 3.5, regla #5)**: tabla `inflation` (IPC mensual INDEC vía argentinadatos, 998 meses backfilleados) + Edge `fetch-inflation` (cron días 4 y 17) + hook `useInflation` (self-healing) + helpers puros `lib/inflation.ts` (`cumulativeInflation` compone mes a mes, `realReturn` Fisher, `realReturnForPosition`). `PnLBadge` muestra **"real +Y%"** bajo el % nominal (por posición y agregado del portafolio). El real se mide **en pesos**: nominal ARS de `profit_loss_ars` vs inflación acumulada desde `purchase_date ?? created_at`. Si no hay IPC cargado, oculta el real.
- **Proyección de pagos / cash-flow (Sprint 5)**: el "Excel de proyección" mejorado. Tablas `projection_items` (gasto cargado 1 vez con recurrencia: `monthly`/`installments`/`once` + `payment_method` como grupo) + `projection_income` (override de ingreso por mes; default = `profile.monthly_income_ars`). Lógica pura `lib/projection.ts` (`buildProjection` arma la grilla mes×ítem agrupada por medio de pago con subtotales + TOTAL + neto Deuda/Ganancia; `debtToProjItem` inyecta las deudas activas con cuota — `installments` = ceil(saldo/cuota) — sin recargarlas). UI `app/projection.tsx` (entry en `more.tsx` → ruta `projection`): tira horizontal de meses con el neto (rojo/verde) + detalle del mes (grupos, cuotas `k/N`, ingreso editable). Modales `add-projection-item` (con **selector de mes** `MonthField`) + `set-income`. **Cuotas con interés (sesión 7):** campo opcional "Interés TNA %" en `add-projection-item`; si se carga, `amount` pasa a ser el **capital** y la cuota mensual sale de `frenchPayment` (sistema francés, `lib/projection.ts`) con preview en vivo. Sin interés, `amount` se usa directo (no rompe nada). Multi-moneda vía MEP (regla #1). **Saldo acumulado proyectado (sesión 7, mejora):** `buildProjection` ahora siembra un saldo con `startingBalanceArs` = `accounts_ars` del patrimonio (efectivo de hoy) y devuelve por mes `cumulativeArs/Usd` + a nivel proyección `firstDeficitMonth`/`deficitMonthCount`. La pantalla muestra un resumen "efectivo hoy → saldo en N meses" + aviso de en qué mes te quedás sin efectivo, y cada tarjeta de mes muestra el saldo acumulado (grande) + el neto del mes (chico). **Bug corregido:** el default de recurrencia era `monthly` → un gasto puntual se repetía a todos los meses; ahora default `once` ("Solo ese mes"), labels claros ("Solo ese mes"/"Todos los meses"/"En cuotas") + preview en vivo del alcance ("Aparece solo en…"/"Se repite desde…"/"N cuotas: X → Y"). **No validado en device.**
- **Presupuestos vivos**: `budgets.spent_ars` mantenido por triggers; modal de alta.
- **Import CSV de brokers** (pegar texto): parser sin deps + dedup por `external_id`.
- **Asesor financiero IA (Sprint 5)**: chat `app/advisor.tsx` (entry en `more.tsx`) → Edge `financial-advisor` (persona AR + prompt caching + contexto financiero vía RLS) → `use-advisor`. **Historial persistido** en AsyncStorage (`lib/store/advisor.ts`) + botón "Limpiar".
- **Categorización IA en lote**: banner "N sin categoría · Categorizar con IA" en tab Movimientos → Edge `categorize-batch` → categoriza los movimientos importados (MP/CSV) que entran sin categoría.
- **CRUD completo**: borrar las 4 entidades (long-press); editar las 4 (tap = editar, reusan su modal de alta en modo edición; investments re-deriva con `deriveInvestmentValues`).
- **Editar perfil**: modal `edit-profile` (nombre, ingreso mensual ARS, dólar preferido, vista) desde *Más → Perfil → Editar perfil* (`useUpdateProfile`). El ingreso editado se refleja como sueldo neto default en la **proyección de pagos**.
- **Fix teclado tapa input (global)** ✅ **FUNCIONA en device (v3)**: componente `components/KeyboardAwareScrollView.tsx` (puro JS, OTA-safe) en los 9 forms (modales + onboarding). v3 (la que anda): NO usa `KeyboardAvoidingView` ni `findNodeHandle`/`measureLayout`/`currentlyFocusedInput+measureLayout` (frágiles en New Arch/Fabric); usa la posición real del teclado (`keyboardDidShow` → `endCoordinates.screenY`) + `measureInWindow` del input enfocado + un **espaciador** del alto del teclado + 3 reintentos (60/180/350 ms). v1 (measureLayout) y v2 (container measureInWindow + adjustResize) NO funcionaban bajo Fabric. (`set-income`/`quick-amount` quedan con `View` simple.) **Pendiente menor (mañana):** el scroll queda "flojo" (a veces no deja el input del todo arriba) → afinar `extraOffset` (hoy 28) y/o los tiempos de reintento. **Chat del asesor (sesión 7):** no usa el ScrollView (es FlatList) — se arregló con `lib/hooks/use-keyboard-height.ts` (`useKeyboardHeight`) + `marginBottom: kbHeight` en el contenedor + `scrollToEnd` al abrir el teclado (antes tenía `KeyboardAvoidingView behavior=undefined` en Android → no hacía nada).
- **Date pickers (sesión 7)** ✅ JS puro, OTA-safe: `components/DateField.tsx` (calendario → `YYYY-MM-DD`, con Hoy/Limpiar) y `components/MonthField.tsx` (mes+año → `YYYY-MM`). Reemplazan los `TextInput` "AAAA-MM-DD"/"AAAA-MM" a mano en: `add-goal` (fecha objetivo), `add-debt` (próximo vencimiento), `add-investment` (inicio + vencimiento) y `add-projection-item` (mes de inicio, con `MonthField`). Esto también **resuelve el bug "gasto de julio caía en junio"**: el mes era texto libre que arrancaba en el mes actual y era fácil dejarlo sin cambiar.
- **Branding/UI**: ícono de app + adaptive + splash (gradiente indigo→cyan + "$", generados con `scripts/gen-icons.py` vía PIL → `assets/`). Tabs con íconos Ionicons (`@expo/vector-icons`), sin header redundante; todas las tabs con safe-area `top`; wordmark "Mi Platica" en el dashboard.
- **Design system (sesión 7, refresh visual completo)** — puro JS, OTA-safe, sin deps nativas nuevas:
  - **Tokens:** `lib/colors.ts` (paleta expandida: superficies en capas `backgroundDark`→`surfaceDark`→`surfaceElevated`→`surfaceSunken`, acentos `primaryBright`/`primaryDeep`/`accent` cyan, soft tints) + `lib/theme.ts` (escalas `spacing` base-4, `radius`, `typography` por rol semántico, `shadow` sm/md/glow). **Importar de `lib/theme` (re-exporta `colors`).**
  - **Primitivas display** (`components/ui.tsx`): `Card`, `Fab`, `ScreenTitle`, `SectionLabel`, `CtaButton`, `ProgressBar`, `IconChip`. **Primitivas de formulario** (`components/form.tsx`): `FormScreen` (SafeAreaView+KeyboardAwareScrollView+Stack.Screen title), `FormField`, `FormInput`, `FormChip`, `ChipRow`, `SubmitButton`, export `form` (estilos: `safe`/`container`/`input`/`multiline`). **Los 11 modales-form usan estas primitivas** (antes cada uno duplicaba field/input/chip/submit). `set-income`/`quick-amount` mantienen `KeyboardAvoidingView+View` (autoFocus) pero usan `FormInput`/`SubmitButton`.
  - **Héroe:** `NetWorthCard` = card indigo profundo con glow + blobs de acento + breakdown con `IconChip`. Dashboard con avatar+wordmark. `StateMessage` con ícono circular. `DateField`/`MonthField` con Ionicon (no emoji). **Pantallas grandes** (`advisor`, `projection`) y **auth** (`login` con logo "$", `onboarding`) también refresacadas. **No validado en device aún.**
- **Calidad**: 46 tests `bun test` (verde) sobre `csv.ts`, `broker-import.ts`, `instruments.ts`, `reminders.ts`, `inflation.ts`, `prices.ts`, `projection.ts` (incluye `frenchPayment` + cuotas con interés). `type-check:app` **limpio** (sesión 4: arreglado tuple `segments[1]` en `_layout.tsx` + excluidos del tsconfig de la app los dirs KATA `api/`/`cli/`/`config/`/`scripts/`, ya cubiertos por `tsconfig.test.json`). `type-check:test` tiene errores KATA pre-existentes (falta dep `allure-js-commons`), ajenos a la app.

**Backend live:** ver "Integraciones activas". Migraciones aplicadas hasta `0005`. Crons activos.

---

## Próxima sesión (sesión 5) — plan

**✅ 2 hallazgos de MP — RESUELTOS (sesión 5, `mp-sync-movements` v2 ACTIVE):**

1. ~~**Saldo de MP automático**~~ ❌ **NO es posible** (MP da 403 forbidden al saldo de billetera por OAuth en cuentas personales — ver abajo). Quedó como **saldo manual** en la cuenta MP. El patrimonio lo toma de `v_net_worth.accounts_ars` (suma `balance_amount`), así que con cargarlo a mano se ve.
2. **Duplicados.** `ensureMpAccount` ahora reusa **cualquier** cuenta del user con nombre tipo "mercado pago" (ilike, case/espacios-insensitive), sin importar `integration_type`; prioriza la `api`, y si adopta una manual la promueve a `api`/`connected`. Ya no crea cuentas nuevas si existe una. **Limpieza hecha:** se borró la cuenta manual vacía duplicada (`85cd2b9d`, 0 tx/0 balance); queda solo la `api` `8d354a5c` (100 tx).

> ❌ **Saldo de MP por API: IMPOSIBLE (resuelto/cerrado).** Diagnóstico con probes (cron force): `/users/{id}/mercadopago_account/balance` → **403 `ForbiddenApiError`**; `/v1/account/balance` → 404; `/users/me` → 200 (token OK, cuenta **personal**). MP **no expone el saldo de billetera por OAuth** para cuentas personales (no hay scope). El token de cobrador solo da **pagos recibidos** (que sí sincronizan). **Decisión:** se sacó toda la lógica de balance de `mp-sync-movements` (v4) y `mp-sync-cron` (v3); la **cuenta MP lleva saldo manual** (tocar la cuenta en el dashboard → "Editar cuenta" → cargar saldo; `add-account` muestra un hint para cuentas `api`). Los pagos recibidos siguen sincronizando solos.

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
| `ANTHROPIC_API_KEY` | **Edge Functions** (`supabase secrets set`) | ✅ seteada y verificada en device (sesión 6) |
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

> Recordá: trae los **`regular_payment` aprobados** en los que el user participa, **clasificados por dirección** (`collector_id == mp_user_id` → ingreso; si no → gasto). Excluye `money_transfer`/`investment`/`account_fund` (plata propia moviéndose). Pagina hasta `MAX_PAGES`. NO trae el saldo de billetera (403 por OAuth → manual).

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
- [x] Auth Supabase (email+password) vía `lib/supabase.ts` + `lib/auth.tsx` + `use-profile.ts`. **Cache por sesión (fix sesión 5):** `useProfile` tiene `enabled: !!session` (no cachea `null` sin sesión); `onAuthStateChange` hace `queryClient.clear()` en `SIGNED_IN`/`SIGNED_OUT` (privacidad + evita que un `["profile"]=null` stale re-dispare el onboarding a un user existente); persister con `buster: "v2"` para limpiar el cache envenenado ya existente.
- [x] Edge `fetch-exchange-rates` (ACTIVE, `verify_jwt=false`) → dolarapi → `exchange_rates`. Self-healing client-side.
- [x] Edge `categorize-transaction` (ACTIVE, `verify_jwt=true`, prompt caching). Categoriza UNA transacción (flujo "✨ Sugerir categoría" del alta).
- [x] Edge `categorize-batch` (ACTIVE, `verify_jwt=true`, **v1**, prompt caching) → categoriza en LOTE los movimientos `category IS NULL` del user (1 llamada a Claude por tanda de 50, valida grupo gasto/ingreso, fallback seguro). Cliente: `useCategorizeBatch` + banner en tab Movimientos.
- [ ] Edge `monthly-summary` (**CÓDIGO LISTO, NO DEPLOYADO** — sesión 8). `verify_jwt=true`, prompt caching, Claude `claude-sonnet-4-6`. Resumen mensual en lenguaje natural: agrega gasto por categoría (mes actual vs anterior) + ingreso + inflación server-side (RLS) y pide a Claude un recap corto. Cliente: `use-monthly-summary` + `app/monthly-summary.tsx`. **Deployar:** `bunx supabase functions deploy monthly-summary`.
- [x] Edge `financial-advisor` (ACTIVE, `verify_jwt=true`, prompt caching, **v2**). Arma contexto del user vía RLS, con **contexto de inflación** (IPC mensual + acum. 3m/12m) + **rendimiento real por posición en pesos**. ✅ `ANTHROPIC_API_KEY` seteada, verificado en device. Chat persistido client-side (`lib/store/advisor.ts`).
- [x] Edge `update-asset-prices` (ACTIVE, `verify_jwt=false`, **v4**) → data912 + **CoinGecko (cripto, 21 tickers)** + dolarapi → `asset_prices`. Devuelve/loguea `coverage` por fuente. Llama `refresh_positions()` por RPC al final.
- [x] Edge `fetch-inflation` (ACTIVE, `verify_jwt=false`) → argentinadatos → `inflation` (IPC mensual, upsert idempotente). 998 meses backfilleados.
- [x] Función SQL `refresh_positions()` (migración `0003`, `security_definer`, revaloriza posiciones).
- [x] pg_cron: `update-asset-prices` (`*/15 14-20 * * 1-5`) + `fetch-exchange-rates` (`*/30 * * * *`) + `fetch-inflation` (`0 14 4,17 * *`) + **`mp-sync-cron` (`0 */6 * * *`)**, vía `net.http_post` keyless. Probados.
- [x] Edge `mp-sync-cron` (ACTIVE, `verify_jwt=false`, **v7**) → itera todas las `mp_connections` con service_role y sincroniza los pagos de cada una (misma lógica que `mp-sync-movements`, duplicada a propósito). Anti-abuso: saltea conexiones sincronizadas hace < 30 min. Disparable a mano por SQL: `select net.http_post('…/functions/v1/mp-sync-cron', '{"Content-Type":"application/json"}'::jsonb, '{}'::jsonb)` (resetear `last_synced_at` antes para saltear el anti-abuso).
- [x] Import CSV de movimientos (Cocos/PPI/IOL/banco) por alias de columnas + dedup `external_id`.
- [x] **`ANTHROPIC_API_KEY`** en secrets — ✅ seteada y verificada en device (sesión 6: asesor IA responde OK, `categorize-transaction`/`financial-advisor` operativos).
- [x] **Mercado Pago OAuth — backend LIVE (Sprint 4).** Migración `0007` aplicada + edges ACTIVE (`mp-oauth-start` v1 jwt, `mp-oauth-callback` v1 público, `mp-sync-movements` **v6** jwt) + 4 secrets seteados (CLIENT_ID/SECRET/REDIRECT_URI/TOKEN_KEY). Cliente: `use-mp.ts` + `MercadoPagoConnect` en `more.tsx` (`expo-web-browser`). **Sesión 6:** sincroniza `regular_payment` aprobados **clasificados por dirección** (collector → ingreso; si no → gasto) + paginación; excluye transferencias/rendimientos/cargas. Verificado en device del user: 187 gastos / 15 ingresos. Sync manual (botón) + cron cada 6 h.
- [x] **FCI vía argentinadatos** (sesión 7, client-side, sin cron) — selector de fondos + VCP del día. Ver feature "FCI". Open Banking BCRA — eval futuro.

**Migraciones aplicadas:** `0001_init_schema`, `0002_helper_views`, `0003_refresh_positions`, `0004_schedule_crons`, `0005_budget_spent_triggers`, `0006_inflation`, `0007_mp_connections` (mp_connections cifrada con pgcrypto + mp_oauth_states + funciones `mp_store_connection`/`mp_get_tokens` con `search_path = public, extensions` — pgcrypto vive en `extensions` en Supabase), `0008_portfolio_by_type` (vista `v_portfolio_by_type` con `security_invoker=on` — agrega valor/% por tipo de instrumento), `0009_payment_projection` (`projection_items` + `projection_income` con RLS owner-only + triggers updated_at — proyección de cash-flow), `0010_schedule_mp_sync_cron` (pg_cron `mp-sync-cron` cada 6 h), `0011_projection_item_interest` (columna `interest_rate numeric(6,2)` nullable en `projection_items` — TNA % para cuotas con interés; cuando está seteada, `amount` es el capital y la cuota se calcula con sistema francés client-side).

---

## Deuda técnica

- **`expo-updates` reactivado** (post `eas init`): `app.json` tiene `updates.url` + `runtimeVersion`, dep `~29` instalada (cambios sin commitear). Expo Go ignora expo-updates, pero un dev/preview build sí lo usa. Antes causaba crash al boot (`IOException`) cuando `updates.url` apuntaba a endpoint inexistente; **ahora la URL es real**, así que debería estar OK — **verificar el boot del APK en device**.
- **Validación en device incompleta:** solo Sprints 0→1 probados en Expo Go. Resto de sesión 2 sin validar (ojo navegación post expo-router 6).
- ~~`claude-sonnet-4-5-20250929` → migrar a `claude-sonnet-4-6` cuando GA~~ ✅ **HECHO sesión 5**: ambos edges de IA en `claude-sonnet-4-6` (`categorize-transaction` v7, `financial-advisor` v8).
- **`update-asset-prices` depende de data912.com** (gratuita, no oficial, sin SLA) para acciones/CEDEARs/bonos/ON; cripto vía CoinGecko; MEP vía dolarapi. Si cambia el shape de data912, ajustar `SOURCES`/`normalize`. **FCI** vía argentinadatos (client-side, sesión 7). Sin Sentry. (Edge deployada v4 — cripto + coverage live.)
- **`expo-linear-gradient` (sesión 7) es dep NATIVA** → el gradiente real indigo→cyan del héroe (`NetWorthCard`) y el logo del `login` **solo se ven en un APK rebuildeado** con el módulo. **OTA-safe igual:** se usan vía `components/BrandGradient.tsx` (error boundary) que, si el módulo nativo no está en el binario (p.ej. OTA al APK viejo `de26cdb7`), **cae a fondo sólido indigo** sin romper la pantalla. Así que se puede OTA-ear sin miedo; el gradiente "aparece" recién con el próximo APK. (`lib/theme.ts` → `gradients.brand`.)
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
| 5 | Asesor financiero IA | ✅ (Edge `financial-advisor` + chat; `ANTHROPIC_API_KEY` ✅, verificado en device sesión 6; **historial persistido** + botón Limpiar). |
| 6 | Deudas, metas y presupuestos avanzados | ✅ deudas + presupuestos vivos + metas de ahorro + recordatorios de vencimiento (in-app + notif locales) |

*Última actualización: 2026-06-01 (sesión 6): fix gordo de MP (income/expense por dirección + paginación, solo regular_payment aprobados) + APK `de26cdb7` + asesor IA verificado y con chat persistente + auto-categorización IA en lote (`categorize-batch`). Historial detallado por sprint en el git log.*
