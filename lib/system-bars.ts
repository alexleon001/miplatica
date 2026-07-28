// Barra de navegación de Android (los 3 botones / la píldora de gestos).
//
// Problema que resuelve: con el tema claro, los botones del sistema quedaban
// oscuros sobre fondo claro… o claros sobre claro, invisibles, según el ROM.
// `expo-navigation-bar` deja elegir el color de los botones; lo atamos a la
// luminancia del fondo del tema activo.
//
// Módulo NATIVO → require() guardado, igual que ads/purchases: un import
// estático crashea el boot en APKs que no traen el nativo (updates OTA sobre un
// build viejo). Sin módulo, no-op.

import { Platform } from "react-native";

type NavigationBarModule = typeof import("expo-navigation-bar");

let mod: NavigationBarModule | null | undefined;

function getModule(): NavigationBarModule | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line ts/no-require-imports -- require guardado a propósito (ver comentario de arriba)
    mod = require("expo-navigation-bar") as NavigationBarModule;
  } catch {
    mod = null;
  }
  return mod;
}

/**
 * Pinta los botones de la barra de navegación para que contrasten con el tema.
 * `dark` = íconos oscuros (para fondos claros), `light` = íconos claros.
 * No-op fuera de Android o sin el módulo nativo.
 */
export function syncNavigationBar(themeIsDark: boolean): void {
  if (Platform.OS !== "android") return;
  const nav = getModule();
  if (!nav) return;
  // En edge-to-edge (default desde SDK 54) el fondo de la barra lo maneja el
  // sistema y sólo se puede tocar el estilo de los botones.
  void nav.setButtonStyleAsync(themeIsDark ? "light" : "dark").catch(() => {});
}
