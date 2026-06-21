// Paleta base de Mi Plática.
//
// REDISEÑO "Línea": el color ahora vive en lib/theme-tokens.ts (temas esmeralda /
// terracota × claro/oscuro). Este archivo expone la paleta ESTÁTICA por defecto
// (Esmeralda oscuro) bajo los nombres de key históricos, para que toda pantalla
// que todavía no migró a useTheme() adopte igual la paleta nueva sin romper.
//
// Para color que cambie en runtime con el selector de Apariencia, usar
// `useTheme()` de lib/theme-context (devuelve las MISMAS keys, vivas).

import { buildPalette, THEMES } from "./theme-tokens";

export const colors = buildPalette(THEMES.esmeralda.dark);

export type ColorToken = keyof typeof colors;
