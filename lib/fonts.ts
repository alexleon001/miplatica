// Fase F del rediseño "Línea": tipografía Space Grotesk en TODA la app.
//
// RN no mapea `fontWeight` → archivo de fuente automáticamente: cada peso de una
// fuente custom es un archivo/familia distinta. En vez de tocar cada estilo para
// agregar `fontFamily` (cientos de lugares), parcheamos UNA sola vez el render de
// <Text> (y <TextInput>) para inyectar la familia correcta según el `fontWeight`
// del estilo. Respeta los `fontWeight` ya escritos en todas las pantallas.
//
// Degradación segura: si las fuentes no cargaron (OTA a un APK sin los assets,
// error de red) NO parcheamos → la app usa la fuente del sistema y nada rompe.
// Space Grotesk llega hasta 700; 800 (display) cae a Bold.

import { cloneElement, type ReactElement } from "react";
import { StyleSheet, Text, TextInput, type TextStyle } from "react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";

export const FONT_MAP = {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} as const;

// fontWeight (string|number) → familia. "normal"/undefined = 400; "bold"/800 = 700.
function familyForWeight(weight: TextStyle["fontWeight"]): string {
  switch (String(weight ?? "400")) {
    case "100":
    case "200":
    case "300":
    case "400":
    case "normal":
      return "SpaceGrotesk_400Regular";
    case "500":
      return "SpaceGrotesk_500Medium";
    case "600":
      return "SpaceGrotesk_600SemiBold";
    case "700":
    case "800":
    case "900":
    case "bold":
      return "SpaceGrotesk_700Bold";
    default:
      return "SpaceGrotesk_400Regular";
  }
}

// Inyecta la familia según el peso, salvo que el estilo ya defina una fontFamily.
function withFamily(style: unknown) {
  const flat = (StyleSheet.flatten(style as never) ?? {}) as TextStyle;
  if (flat.fontFamily) return style; // respeta familias explícitas (ej: monospace del CSV)
  return [{ fontFamily: familyForWeight(flat.fontWeight) }, style];
}

let patched = false;

// Parchea el render de Text/TextInput. Llamar UNA vez, después de que las fuentes
// cargaron. Idempotente. Si el render base no existe (cambio de RN), no hace nada.
type StyledEl = ReactElement<{ style?: unknown }>;
type Renderable = { render?: (...a: unknown[]) => StyledEl | null };

export function patchTextFonts() {
  if (patched) return;
  for (const Comp of [Text, TextInput] as unknown as Renderable[]) {
    const orig = Comp.render;
    if (typeof orig !== "function") continue;
    Comp.render = function patchedRender(...args: unknown[]) {
      const el = orig.apply(this, args);
      if (!el?.props) return el;
      return cloneElement(el, { style: withFamily(el.props.style) });
    };
  }
  patched = true;
}

// Hook para el root: carga las 4 variantes y parchea al terminar. Devuelve si ya
// se puede renderizar (cargó o falló — en ambos casos seguimos, sin colgar el boot).
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_MAP);
  if (loaded) patchTextFonts();
  return loaded || error != null;
}
