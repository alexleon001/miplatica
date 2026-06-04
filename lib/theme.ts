// Design system de Mi Platica: escalas de espaciado, radios, tipografía y sombras.
// Pensado para que todas las pantallas compartan el mismo ritmo visual.
// Los colores viven en ./colors (re-exportados acá por conveniencia).
import { Platform } from "react-native";
import { colors } from "./colors";

export { colors };

// Espaciado base 4. Usar estos valores en vez de números mágicos.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

// Radios de borde.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  full: 999,
} as const;

// Escala tipográfica: tamaño + line-height + peso por rol semántico.
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "500" as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "700" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
  // Etiqueta de sección (mayúsculas, tracking ancho).
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
} as const;

// Gradiente de marca (indigo→cyan, diagonal). Para usar con expo-linear-gradient:
// `<LinearGradient {...gradients.brand} style={...} />`. El cyan aparece recién
// en el último tramo (locations) para que el texto sobre indigo siga legible.
export const gradients = {
  brand: {
    colors: ["#4F46E5", "#4338CA", "#0891B2"] as const,
    locations: [0, 0.6, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

// Sombras (elevación). iOS usa shadow*, Android usa elevation.
// En Android, `elevation` sobre cards que ya tienen borde agrega overdraw (y con
// overflow:hidden + borderRadius fuerza render offscreen). Como el borde ya las
// define, mantenemos las sombras suaves en iOS y bajamos/anulamos la elevation en
// Android para que no se ponga pesado. El FAB y el héroe conservan algo de relieve.
export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
    },
    android: { elevation: 0 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.24,
      shadowRadius: 14,
    },
    android: { elevation: 3 },
    default: {},
  }),
  // Glow de acento para el héroe (tinte indigo).
  glow: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
    },
    android: { elevation: 4 },
    default: {},
  }),
} as const;
