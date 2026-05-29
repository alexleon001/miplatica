// ScrollView que evita que el teclado tape el input enfocado.
// Drop-in para los formularios: reemplaza el patrón
//   <KeyboardAvoidingView><ScrollView>…</ScrollView></KeyboardAvoidingView>
//
// 100% JS (sin módulos nativos → entregable por OTA) y compatible con la New
// Architecture (Fabric): NO usa findNodeHandle + measureLayout (que con Fabric
// fallan en silencio). En su lugar, al aparecer el teclado mide el input
// enfocado y el contenedor visible con measureInWindow y scrollea lo justo para
// dejar el input arriba del teclado.
//
// - iOS: KeyboardAvoidingView (padding) achica el contenedor visible.
// - Android: el default de Expo (adjustResize) achica la ventana → el contenedor
//   (flex:1) ya queda arriba del teclado, así que su borde inferior medido ≈
//   tope del teclado.

import { useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  type ScrollViewProps,
  TextInput,
  View,
} from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Margen extra (px) entre el input y el borde del teclado. */
  extraOffset?: number;
};

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  extraOffset = 24,
  onScroll,
  onLayout,
  ...rest
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const containerRef = useRef<View>(null);
  const offsetY = useRef(0);
  const viewportH = useRef(0);
  const kbVisible = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      kbVisible.current = true;
      // Doble disparo: el timeout cubre el caso general; el onLayout del
      // ScrollView (cuando el viewport se achica por el teclado) cubre el timing
      // de adjustResize en Android. Ambos miden con el contenedor ya reducido.
      setTimeout(scrollFocusedIntoView, 90);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      kbVisible.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollFocusedIntoView() {
    const input = TextInput.State.currentlyFocusedInput?.() as Measurable | null | undefined;
    const container = containerRef.current as Measurable | null;
    const scroll = scrollRef.current;
    if (!input || !container || !scroll) return;

    // Mide el input y el contenedor visible en coordenadas de ventana. El borde
    // inferior visible (cy+ch) ya excluye el teclado (resize/padding).
    container.measureInWindow((_cx, cy, _cw, ch) => {
      const visibleBottom = cy + ch;
      input.measureInWindow((_ix, iy, _iw, ih) => {
        if (ih === 0 && iy === 0) return; // medición inválida
        const inputBottom = iy + ih;
        const overlap = inputBottom - (visibleBottom - extraOffset);
        if (overlap > 0) {
          scroll.scrollTo({ y: offsetY.current + overlap, animated: true });
        } else {
          // input por encima del área visible (scrolleado de más): subir hasta él.
          const above = cy + extraOffset - iy;
          if (above > 0) scroll.scrollTo({ y: Math.max(0, offsetY.current - above), animated: true });
        }
      });
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View ref={containerRef} collapsable={false} style={{ flex: 1 }}>
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
            const h = e.nativeEvent.layout.height;
            // Si el teclado está visible y el viewport acaba de achicarse (resize
            // de Android), este es el momento exacto para reposicionar el input.
            const shrank = viewportH.current > 0 && h < viewportH.current;
            viewportH.current = h;
            if (kbVisible.current && shrank) setTimeout(scrollFocusedIntoView, 0);
            onLayout?.(e);
          }}
          {...rest}
        >
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
