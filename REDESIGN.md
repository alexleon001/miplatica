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
- **Fase 2 — Patrimonio (home / `app/(tabs)/index.tsx` + NetWorthCard, CurrencyToggle, NetWorthChart, AccountsList, ExchangeRatesBar).** Layout B.
- **Fase 3 — Movimientos (`app/(tabs)/transactions.tsx` + TransactionItem, SpendingBreakdown, banners).**
- **Fase 4 — Inversiones (`app/(tabs)/investments.tsx` + PnLBadge, distribución).**
- **Fase 5 — Deudas (`app/(tabs)/debts.tsx`).**
- **Fase 6 — Más (`app/(tabs)/more.tsx`): lista de accesos con divisores hairline (ya tiene Apariencia de Fase 1).**
- **Fase 7 — Nav inferior (tab bar): activo `accent` + indicador 2px, inactivos `textFaint`.**  (`app/(tabs)/_layout.tsx`)
- **Fase 8 — Primitivas compartidas (`components/ui.tsx`, `components/form.tsx`, `MoneyAmount`): que acepten/usen `useTheme()`.** Clave para que el resto reaccione al tema.
- **Fase 9 — Pantallas "no visibles": groups (index/[id]/modales), advisor, projection, insights, invest-sim, categories, rate-alerts, paywall, monthly-summary, todos los `app/modals/*`, `(auth)` login/onboarding.**
- **Fase F — Fuente Space Grotesk** (global, con mapeo de pesos). Requiere `@expo-google-fonts/space-grotesk` + `useFonts`. OTA-safe (assets via eas update). Pendiente, hacer con cuidado por el mapeo de fontWeight→archivo.

## Estado por archivo (marcar al migrar)

- [x] `lib/theme-tokens.ts`, `lib/store/appearance.ts`, `lib/theme-context.tsx`, `lib/colors.ts`, `app/_layout.tsx`
- [ ] Apariencia selector (`components/AppearanceSettings.tsx` o similar) + entrada en `more.tsx`
- [ ] (tabs) index/transactions/investments/debts/more + sus componentes
- [ ] `app/(tabs)/_layout.tsx` (tab bar)
- [ ] `components/ui.tsx`, `components/form.tsx`, `components/MoneyAmount.tsx`
- [ ] groups (index/[id]/modales), advisor, projection, insights, invest-sim, categories, rate-alerts, paywall, monthly-summary, modals/*, (auth)/*
- [ ] Fuente Space Grotesk

## Notas / gotchas

- RN no tiene `color-mix()` ni CSS vars → usar `withAlpha()` y la paleta de `useTheme()`.
- `tabular-nums` en RN = `style={{ fontVariant: ["tabular-nums"] }}`.
- Cambiar `lib/colors.ts` reacciona SOLO al reiniciar (es estático). El selector vivo solo afecta pantallas migradas a `useTheme()`. Por eso Fase 8 (primitivas) es la que hace que "todo" reaccione.
- Cada fase: type-check + lint + tests verdes, OTA a `preview`, commit (`--no-verify`, sin AI attribution), y **actualizar este archivo**.
