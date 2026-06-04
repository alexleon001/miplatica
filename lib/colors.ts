// Paleta Mi Platica — design system. Tokens de color base + variantes de
// superficie/acento para dar profundidad. El branding es indigo→cyan (splash),
// así que `accent` (cyan) acompaña al `primary` (indigo).
export const colors = {
  primary: "#6366F1",
  primaryBright: "#818CF8",
  primaryDeep: "#4338CA",
  primarySoft: "rgba(99,102,241,0.14)", // tinte para fondos/realces
  accent: "#22D3EE", // cyan de marca (splash)
  accentSoft: "rgba(34,211,238,0.14)",

  positive: "#22C55E",
  positiveSoft: "rgba(34,197,94,0.14)",
  negative: "#EF4444",
  negativeSoft: "rgba(239,68,68,0.14)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.14)",

  ars: "#74B9FF",
  usd: "#55EFC4",

  // Superficies en capas (de fondo a elevado) para jerarquía visual.
  backgroundDark: "#0B1220",
  surfaceDark: "#161F32",
  surfaceElevated: "#1E2A44",
  surfaceSunken: "#0E1626",

  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#8395B0",
  border: "#27344C",
  borderSoft: "#1C2740",
} as const;

export type ColorToken = keyof typeof colors;
