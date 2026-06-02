// Altura del teclado (px) en tiempo real, 100% JS (OTA-safe).
// Sirve para subir manualmente una barra de input cuando KeyboardAvoidingView
// no es confiable bajo New Architecture/Fabric (ver nota en CLAUDE.md / el
// componente KeyboardAwareScrollView). Devuelve 0 cuando el teclado está oculto.

import { useEffect, useState } from "react";
import { Keyboard, type KeyboardEvent } from "react-native";

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e: KeyboardEvent) => {
      setHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
