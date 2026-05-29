// ScrollView que evita que el teclado tape el input enfocado.
// Drop-in para los formularios: reemplaza el patrón
//   <KeyboardAvoidingView><ScrollView>…</ScrollView></KeyboardAvoidingView>
//
// Cómo funciona (100% JS, sin módulos nativos → entregable por OTA):
// - iOS: KeyboardAvoidingView con behavior="padding" achica el viewport.
// - Android: el default de Expo es adjustResize → la ventana ya se achica.
// - En ambos, al aparecer el teclado medimos el input enfocado contra el
//   viewport visible (alto real del ScrollView vía onLayout) y, si queda tapado,
//   scrolleamos lo justo para dejarlo arriba del teclado.

import { useEffect, useRef } from "react";
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  type ScrollViewProps,
  TextInput,
} from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Margen extra (px) entre el input y el borde del teclado. */
  extraOffset?: number;
};

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  extraOffset = 24,
  onScroll,
  onLayout,
  ...rest
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const viewportH = useRef(0);

  useEffect(() => {
    // keyboardDidShow espera a que el layout se reacomode (resize/padding).
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      // pequeño delay para que onLayout ya haya actualizado viewportH.
      setTimeout(scrollFocusedIntoView, 60);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollFocusedIntoView() {
    const input = TextInput.State.currentlyFocusedInput?.() as
      | {
          measureLayout: (
            node: number,
            onSuccess: (x: number, y: number, w: number, h: number) => void,
            onFail?: () => void,
          ) => void;
        }
      | null
      | undefined;
    const scroll = scrollRef.current;
    const node = scroll ? findNodeHandle(scroll) : null;
    if (!input || !scroll || node == null || viewportH.current === 0) return;

    // measureLayout: posición del input relativa al contenido del ScrollView
    // (independiente del scroll actual).
    input.measureLayout(
      node,
      (_x: number, y: number, _w: number, h: number) => {
        const top = y;
        const bottom = y + h;
        const visibleTop = offsetY.current;
        const visibleBottom = offsetY.current + viewportH.current;
        if (bottom > visibleBottom - extraOffset) {
          scroll.scrollTo({ y: bottom - viewportH.current + extraOffset, animated: true });
        } else if (top < visibleTop + extraOffset) {
          scroll.scrollTo({ y: Math.max(0, top - extraOffset), animated: true });
        }
      },
      () => {},
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offsetY.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        onLayout={(e: LayoutChangeEvent) => {
          viewportH.current = e.nativeEvent.layout.height;
          onLayout?.(e);
        }}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
