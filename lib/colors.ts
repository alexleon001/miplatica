// Paleta Mi Platica — definida en FINANZAS_SUPER_PROMPT.md (Guía de diseño)
export const colors = {
  primary: "#6366F1",
  positive: "#22C55E",
  negative: "#EF4444",
  warning: "#F59E0B",
  ars: "#74B9FF",
  usd: "#55EFC4",
  backgroundDark: "#0F172A",
  surfaceDark: "#1E293B",
  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "#334155",
} as const;

export type ColorToken = keyof typeof colors;
