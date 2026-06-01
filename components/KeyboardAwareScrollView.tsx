// ScrollView que evita que el teclado tape el input enfocado.
// Drop-in para los formularios: reemplaza el patrón
//   <KeyboardAvoidingView><ScrollView>…</ScrollView></KeyboardAvoidingView>
//
// 100% JS (sin módulos nativos → OTA-safe) y robusto bajo New Architecture
// (Fabric). NO depende de que la ventana se achique (adjustResize) ni de
// findNodeHandle/measureLayout:
//  - Usa la posición real del teclado (Keyboard event `endCoordinates.screenY`).
//  - Agrega un espaciador del alto del teclado → siempre hay lugar para scrollear.
//  - Mide el input enfocado con measureInWindow y scrollea lo justo para dejarlo
//    arriba del teclado. Reintenta por si el layout tarda en reacomodarse.

import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewProps,
  TextInput,
  View,
} from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Margen extra (px) entre el input y el borde del teclado. */
  extraOffset?: number;
};;

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  extraOffset = 56,
  onScroll,
  ...rest
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e: KeyboardEvent) => {
      setKbHeight(e.endCoordinates.height);
      const keyboardTopY = e.endCoordinates.screenY;
      // Reintentos: el espaciador/layout puede tardar varios frames en
      // asentarse bajo Fabric; el último (550 ms) cubre los layouts lentos.
      [50, 150, 300, 550].forEach((ms) => setTimeout(() => scrollFocusedIntoView(keyboardTopY), ms));
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollFocusedIntoView(keyboardTopY: number) {
    const input = TextInput.State.currentlyFocusedInput?.() as Measurable | null | undefined;
    const scroll = scrollRef.current;
    if (!input || !scroll) return;
    input.measureInWindow((_x, y, _w, h) => {
      if (h === 0 && y === 0) return; // medición inválida
      const inputBottom = y + h;
      const overlap = inputBottom - (keyboardTopY - extraOffset);
      if (overlap > 1) {
        scroll.scrollTo({ y: offsetY.current + overlap, animated: true });
      }
    });
  }

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      contentContainerStyle={contentContainerStyle}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        offsetY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      {...rest}
    >
      {children}
      {/* Espaciador del alto del teclado: garantiza espacio para scrollear el
          último campo por encima del teclado, ande o no adjustResize. */}
      <View style={{ height: kbHeight }} />
    </ScrollView>
  );
}
