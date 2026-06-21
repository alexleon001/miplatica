// ============================================================
// Mi Plática — Sistema de tokens del rediseño "Línea" (minimalista)
// ============================================================
// Fuente de verdad de color, portada del handoff (handoff/assets/theme-tokens.json).
// Dos temas seleccionables — esmeralda (paleta de la versión A) y terracota
// (paleta de la versión C) — cada uno con modo claro y oscuro. El LAYOUT es el
// minimalista de la versión B (sin cajas con borde duro, divisores hairline,
// tabs underline, acento sólo en la acción).
//
// `buildPalette()` expande cada set de tokens a un objeto que incluye:
//   1. los nombres NUEVOS de token (bg, surface, surface2, border, text, textDim,
//      textFaint, accent, accentContrast, pos, neg, warn), y
//   2. ALIAS retro-compatibles con los nombres viejos de lib/colors.ts
//      (primary, surfaceDark, textPrimary, negative, …) para que las pantallas
//      que todavía no migramos sigan compilando y adopten la paleta nueva.
// Así el rediseño se hace incremental: cambiar de tema/modo en runtime impacta
// a las pantallas ya migradas (las que usan useTheme()), y el swap de paleta
// base ya aplica a TODA la app vía lib/colors.ts.

export type ThemeName = "esmeralda" | "terracota";
export type ModeName = "dark" | "light";
export type AppearanceMode = ModeName | "auto";

// Tokens crudos (los 12 del handoff).
export type ThemeTokens = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentContrast: string;
  pos: string;
  neg: string;
  warn: string;
};

export const THEMES: Record<ThemeName, { label: string; dark: ThemeTokens; light: ThemeTokens }> = {
  esmeralda: {
    label: "Esmeralda",
    dark: {
      bg: "#0A0D10", surface: "#121619", surface2: "#1B2026", border: "rgba(255,255,255,0.08)",
      text: "#F1F4F2", textDim: "#929B98", textFaint: "#5C6663",
      accent: "#2FB389", accentContrast: "#04130D", pos: "#46C896", neg: "#E8654F", warn: "#E0A33C",
    },
    light: {
      bg: "#F1F4F1", surface: "#FFFFFF", surface2: "#E9EEEA", border: "rgba(12,22,16,0.10)",
      text: "#0E1413", textDim: "#586460", textFaint: "#8A968F",
      accent: "#0E8E68", accentContrast: "#FFFFFF", pos: "#0E8E68", neg: "#CB4A37", warn: "#A9781B",
    },
  },
  terracota: {
    label: "Terracota",
    dark: {
      bg: "#13110E", surface: "#1C1815", surface2: "#26201B", border: "rgba(255,238,228,0.08)",
      text: "#F4EEE8", textDim: "#A89E94", textFaint: "#6C645B",
      accent: "#E8825A", accentContrast: "#1A0E08", pos: "#5FB98C", neg: "#E2654E", warn: "#E0A24A",
    },
    light: {
      bg: "#F8F2EA", surface: "#FFFDFA", surface2: "#F1E9DD", border: "rgba(70,45,22,0.10)",
      text: "#221B14", textDim: "#6F6358", textFaint: "#A99C8D",
      accent: "#C75F38", accentContrast: "#FFFFFF", pos: "#2E915F", neg: "#C8503A", warn: "#A8751A",
    },
  },
};

// Convierte un hex (#RRGGBB) a rgba con alpha. Para los fondos "soft" (tintes del
// acento/estado) — RN no soporta color-mix(), así que pre-computamos el rgba.
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex; // ya es rgba u otro formato → lo dejamos
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Paleta expandida = tokens nuevos + alias retro-compatibles.
export type Palette = ThemeTokens & {
  // soft/tintes derivados
  accentSoft: string;
  posSoft: string;
  negSoft: string;
  warnSoft: string;
  // ── alias retro-compatibles con lib/colors.ts (no usar en código nuevo) ──
  primary: string;
  primaryBright: string;
  primaryDeep: string;
  primarySoft: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  warning: string;
  warningSoft: string;
  ars: string;
  usd: string;
  backgroundDark: string;
  surfaceDark: string;
  surfaceElevated: string;
  surfaceSunken: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSoft: string;
};

export function buildPalette(t: ThemeTokens): Palette {
  return {
    ...t,
    accentSoft: withAlpha(t.accent, 0.14),
    posSoft: withAlpha(t.pos, 0.14),
    negSoft: withAlpha(t.neg, 0.14),
    warnSoft: withAlpha(t.warn, 0.14),
    // alias → nombres viejos
    primary: t.accent,
    primaryBright: t.accent,
    primaryDeep: t.accent,
    primarySoft: withAlpha(t.accent, 0.14),
    positive: t.pos,
    positiveSoft: withAlpha(t.pos, 0.14),
    negative: t.neg,
    negativeSoft: withAlpha(t.neg, 0.14),
    warning: t.warn,
    warningSoft: withAlpha(t.warn, 0.14),
    ars: t.text,
    usd: t.textDim,
    backgroundDark: t.bg,
    surfaceDark: t.surface,
    surfaceElevated: t.surface2,
    surfaceSunken: t.bg,
    textPrimary: t.text,
    textSecondary: t.textDim,
    textMuted: t.textDim,
    borderSoft: t.border,
  };
}

// Resuelve el modo "auto" contra el esquema del sistema.
export function resolveMode(mode: AppearanceMode, systemScheme: ModeName): ModeName {
  return mode === "auto" ? systemScheme : mode;
}

export function paletteFor(theme: ThemeName, resolvedMode: ModeName): Palette {
  return buildPalette(THEMES[theme][resolvedMode]);
}
