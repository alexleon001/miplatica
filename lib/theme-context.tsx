// Provider + hook del tema vivo. Resuelve tema (esmeralda/terracota) + modo
// (claro/oscuro/auto, este último contra el esquema del sistema) a una paleta
// concreta, y la expone con useTheme(). Las pantallas migradas al rediseño "Línea"
// construyen sus estilos en cada render con `const c = useTheme()` para que el
// cambio de tema/modo se aplique al instante, sin reiniciar la app.

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import { useAppearanceStore } from "./store/appearance";
import { buildPalette, type ModeName, type Palette, paletteFor, resolveMode, THEMES } from "./theme-tokens";

const DEFAULT_PALETTE = buildPalette(THEMES.esmeralda.dark);

const ThemeContext = createContext<Palette>(DEFAULT_PALETTE);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppearanceStore((s) => s.theme);
  const mode = useAppearanceStore((s) => s.mode);

  // Esquema del sistema (sólo importa cuando mode === "auto"). Escuchamos cambios
  // para reaccionar si el usuario alterna claro/oscuro a nivel SO.
  const [systemScheme, setSystemScheme] = useState<ModeName>(
    (Appearance.getColorScheme() ?? "dark") as ModeName,
  );
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme ?? "dark") as ModeName);
    });
    return () => sub.remove();
  }, []);

  const palette = useMemo(
    () => paletteFor(theme, resolveMode(mode, systemScheme)),
    [theme, mode, systemScheme],
  );

  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

// Hook principal: devuelve la paleta viva (tokens nuevos + alias). Usar en cada
// componente migrado y construir los estilos adentro (no en StyleSheet.create a
// nivel módulo, que congela los colores).
export function useTheme(): Palette {
  return useContext(ThemeContext);
}
