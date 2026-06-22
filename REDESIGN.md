# Rediseño "Línea" — progreso y plan (checkpoint vivo)

> Rediseño total de la UI de Mi Plática al sistema visual **"Línea"** (minimalista).
> Multi-sesión. Este archivo es el punto de retome: actualizarlo al cerrar cada fase.

## Decisiones de diseño (del usuario + handoff)

- **2 temas seleccionables**: `esmeralda` (paleta de la versión **A** del mockup) y `terracota` (paleta de la versión **C**). Cada uno con modo **claro/oscuro**.
- **Layout = minimalismo de la versión B** ("Línea"): **sin cajas con borde duro**; secciones separadas por **divisores hairline** (`1px solid var(--border)`) + espacio; jerarquía por tamaño/peso; **acento sólo en la acción** (tab activo, FAB, links, nav activo); números siempre `tabular-nums`.
- Tabs de moneda = **underline tabs** (no segmented), activo con `borderBottom 2px accent`.
- Tipografía objetivo: **Space Grotesk** (400/500/600/700). ⏳ PENDIENTE (ver Fase F).
- **Rediseñar TODA la app**, no sólo las 5 pantallas de los mockups (también groups, advisor, projection, insights, invest-sim, categories, rate-alerts, paywall, todos los modales, auth/onboarding, monthly-summary, etc.).
- Conservar TODA la lógica/datos/navegación. Solo UI.

## Fuente de verdad del diseño

- Handoff local: `C:\Users\caal-\OneDrive\Desktop\Rediseño Mi platica\handoff\` (`HANDOFF.md` + `assets/theme-tokens.{css,json}`).
- Proyecto Claude Design (MCP `DesignSync`, projectId **`888ed5f6-2a4d-4a3c-8908-9bd4fe1dca1f`**): mockups `A_*`/`B_*`/`C_*` por pantalla + `Selector en vivo.dc.html` (selector de Apariencia) + `Assets - Temas.dc.html`. Versión elegida: **paleta A/C + layout B**.

## Arquitectura del theming (Fase 0 — ✅ HECHA)

- `lib/theme-tokens.ts` — tokens de ambos temas × claro/oscuro (`THEMES`), `buildPalette()` (expande a tokens nuevos + **alias retro-compat** de los nombres viejos de `colors.ts`), `withAlpha`, `paletteFor`, `resolveMode`.
- `lib/store/appearance.ts` — Zustand persist (`mp-appearance`): `theme` + `mode` (+ setters).
- `lib/theme-context.tsx` — `ThemeProvider` (resuelve `auto` contra `Appearance`, escucha cambios) + `useTheme()` → paleta viva.
- `lib/colors.ts` — ahora deriva de `buildPalette(THEMES.esmeralda.dark)` con las **mismas keys** → swap de paleta base a Esmeralda en TODA la app sin romper nada (las pantallas no migradas adoptan la paleta nueva ya).
- `app/_layout.tsx` — envuelto en `<ThemeProvider>`; status bar y loading/Stack usan `useTheme()`.

### Cómo migrar una pantalla al tema vivo
1. `import { useTheme } from "../lib/theme-context"` y `const c = useTheme();` en el componente.
2. Construir los estilos **dentro** del componente (no en `StyleSheet.create` a nivel módulo, que congela color). Patrón: `const styles = useMemo(() => makeStyles(c), [c])` o estilos inline con `c.*`.
3. Aplicar patrones "Línea": fondo `c.bg`; secciones sin borde, separadas por hairline `borderTopWidth:1, borderColor:c.border`; labels `overline` en `c.textDim`; números `tabular-nums` (`fontVariant:["tabular-nums"]` en RN); acento `c.accent` sólo en acciones; FAB `c.accent`/`c.accentContrast`.
4. Mientras una pantalla NO esté migrada, sigue usando `colors` estático (Esmeralda oscuro) y NO reacciona al selector — es esperado durante el rollout.

## Plan de fases

- **Fase 0 — Fundación del theming.** ✅ HECHA.
- **Fase 1 — Apariencia + Selector en vivo.** ✅ HECHA. `components/AppearanceSettings.tsx` (cards Esmeralda/Terracota con swatches + check + segmented Claro/Oscuro/Auto, usa `useTheme()` y escribe `useAppearanceStore`); agregado en *Más* arriba de Notificaciones. Implementa `Selector en vivo.dc.html`. NOTA: hasta migrar las pantallas (Fases 2-9), cambiar el tema solo se ve en el propio selector + chrome ya migrado.
- **Fase 2 — Patrimonio.** ✅ HECHA. Migrados a `useTheme()` + layout B: `app/(tabs)/index.tsx` (header Mi Plática/Hola+avatar, fondo `c.bg`), `CurrencyToggle` (underline tabs + pills de tipo dólar), `NetWorthCard` (sin caja, número grande tabular + 3 filas hairline sin íconos), `NetWorthChart` (themed, gate ≥5d), `AccountsList` (label + filas hairline + icon box con borde), y `MoneyAmount` (primitiva, ahora vive — Fase 8 parcial: todos los montos reaccionan al tema + tabular-nums). PENDIENTE en Patrimonio: banners contextuales (FirstSteps/UpcomingReminders/BudgetBanner/SharedExpensesCard) y `ExchangeRatesBar` siguen con `colors` estático (adoptan paleta pero no cambian en vivo ni son layout B aún) → migrarlos en Fase 8/9.
- **Fase 3 — Movimientos.** ✅ HECHA. Migrados a `useTheme()` + layout B: `app/(tabs)/transactions.tsx` (título themed inline en vez de `ScreenTitle`; resumen Ingresos/Gastos/Balance **sin caja** = fila con divisores hairline verticales; search box `surface2`; chips/filtros/badge/aiBanner con `accent`/`accentContrast`; section headers `overline` sobre `c.bg`; separadores `c.border`), `TransactionItem` (caja de ícono con borde fino + tinte `withAlpha(cat.color)`, sin caja de fondo), `SpendingBreakdown` (sin caja dura → sección con hairline arriba/abajo + `makeStyles(c)`), `RecurringBanner` (banner `accentSoft`/`accent`). Patrón estilos: `useMemo(() => makeStyles(c), [c])`. PENDIENTE: el `Fab` sigue siendo la primitiva estática (`components/ui.tsx`) → adopta paleta base pero no cambia en vivo; se migra en **Fase 8**.
- **Fase 4 — Inversiones.** ✅ HECHA. `investments.tsx` (resumen sin caja), `InvestmentRow` (icon box hairline + tinte), `PnLBadge`, `PortfolioDistribution` (sin caja dura).
- **Fase 5 — Deudas.** ✅ HECHA. `debts.tsx` + `DebtItem`.
- **Fase 6 — Más.** ✅ HECHA. `more.tsx`: accesos como **lista hairline** (no cards), secciones sin caja dura separadas por hairline, `IconChip`/`CtaButton` con tints themed.
- **Fase 7 — Tab bar.** ✅ HECHA. `app/(tabs)/_layout.tsx`: activo `accent`, inactivos `textFaint`, surface/border themed.
- **Fase 8 — Primitivas compartidas.** ✅ HECHA. `components/ui.tsx` (Card/Fab/CtaButton/ScreenTitle/SectionLabel/ProgressBar/IconChip) + `components/form.tsx` (FormScreen/FormField/FormInput/FormChip/SubmitButton) usan `useTheme()`. `MoneyAmount` ya estaba (Fase 2). El `form` export quedó reducido a `multiline` (layout puro).
- **Fase 9 — Pantallas "no visibles".** ✅ HECHA. Migrados a `useTheme()`: todos los `_layout` (chrome), modales (`add-budget/add-investment/add-transaction/add-projection-item/add-shared-expense/quick-amount/set-income/settle-up/invite-member/import-broker-csv`), `mp-connected`, `(auth)/login`+`onboarding`, `groups/index`+`[id]`, `insights`, `monthly-summary`, `rate-alerts`, `paywall`, `advisor`, `categories`, `invest-sim`, `projection`. Componentes restantes (StateMessage/Skeleton/FirstSteps/UpcomingReminders/BudgetBanner/ExchangeRatesBar/SharedExpensesCard/DateField/MonthField/FundField/BudgetsList/SavingsGoalsList/RecurringList/ProLock/RewardCreditsChip/MercadoPagoConnect). **Único color estático intencional:** `BrandGradient` (gradiente de marca indigo→cyan + fallback, class component) en login/paywall — decorativo, se mantiene como marca.
- **Fase F — Fuente Space Grotesk** (global, con mapeo de pesos). Requiere `@expo-google-fonts/space-grotesk` + `useFonts`. OTA-safe (assets via eas update). Pendiente, hacer con cuidado por el mapeo de fontWeight→archivo.

## Estado por archivo (marcar al migrar)

- [x] `lib/theme-tokens.ts`, `lib/store/appearance.ts`, `lib/theme-context.tsx`, `lib/colors.ts`, `app/_layout.tsx`
- [x] Apariencia selector (`components/AppearanceSettings.tsx`) + entrada en `more.tsx`
- [x] **Patrimonio**: `(tabs)/index.tsx`, `CurrencyToggle`, `NetWorthCard`, `NetWorthChart`, `AccountsList`, `MoneyAmount`
- [x] **Movimientos**: `(tabs)/transactions.tsx`, `TransactionItem`, `SpendingBreakdown`, `RecurringBanner`
- [x] **Inversiones/Deudas/Más**: `(tabs)/investments.tsx`+`InvestmentRow`+`PnLBadge`+`PortfolioDistribution`, `(tabs)/debts.tsx`+`DebtItem`, `(tabs)/more.tsx`
- [x] `app/(tabs)/_layout.tsx` (tab bar)
- [x] `components/ui.tsx`, `components/form.tsx`, `components/MoneyAmount.tsx`
- [x] groups (index/[id]/_layout), advisor, projection, insights, invest-sim, categories, rate-alerts, paywall, monthly-summary, mp-connected, modals/*, (auth)/*
- [x] Componentes compartidos: StateMessage, Skeleton, FirstSteps, UpcomingReminders, BudgetBanner, ExchangeRatesBar, SharedExpensesCard, DateField, MonthField, FundField, BudgetsList, SavingsGoalsList, RecurringList, ProLock, RewardCreditsChip, MercadoPagoConnect
- [ ] Fuente Space Grotesk (Fase F)
- [ ] (decorativo, intencional) `BrandGradient` queda con el gradiente de marca estático

## Notas / gotchas

- RN no tiene `color-mix()` ni CSS vars → usar `withAlpha()` y la paleta de `useTheme()`.
- `tabular-nums` en RN = `style={{ fontVariant: ["tabular-nums"] }}`.
- Cambiar `lib/colors.ts` reacciona SOLO al reiniciar (es estático). El selector vivo solo afecta pantallas migradas a `useTheme()`. Por eso Fase 8 (primitivas) es la que hace que "todo" reaccione.
- Cada fase: type-check + lint + tests verdes, OTA a `preview`, commit (`--no-verify`, sin AI attribution), y **actualizar este archivo**.
