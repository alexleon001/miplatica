// Selector de Apariencia del rediseño "Línea" (implementa "Selector en vivo").
// Tema (Esmeralda / Terracota) con mini-swatches + check en el activo, y Modo
// (Claro / Oscuro / Auto) como segmented. Escribe en useAppearanceStore; el
// ThemeProvider recalcula la paleta y la app migrada se actualiza al instante.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppearanceStore } from "../lib/store/appearance";
import { type AppearanceMode, type ThemeName, THEMES } from "../lib/theme-tokens";
import { useTheme } from "../lib/theme-context";

const THEME_ORDER: ThemeName[] = ["esmeralda", "terracota"];
const MODES: { value: AppearanceMode; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "auto", label: "Auto" },
];

export function AppearanceSettings() {
  const c = useTheme();
  const theme = useAppearanceStore((s) => s.theme);
  const mode = useAppearanceStore((s) => s.mode);
  const setTheme = useAppearanceStore((s) => s.setTheme);
  const setMode = useAppearanceStore((s) => s.setMode);

  return (
    <View style={{ gap: 18 }}>
      {/* Tema */}
      <View style={{ gap: 12 }}>
        <Text style={[styles.label, { color: c.textDim }]}>Tema</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {THEME_ORDER.map((name) => {
            const t = THEMES[name];
            const selected = theme === name;
            return (
              <Pressable
                key={name}
                onPress={() => setTheme(name)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.themeCard,
                  { backgroundColor: c.surface, borderColor: selected ? c.accent : c.border },
                  selected && { borderWidth: 2 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.swatches}>
                  <View style={[styles.swatch, { backgroundColor: t.dark.bg }]} />
                  <View style={[styles.swatch, { backgroundColor: t.dark.accent }]} />
                  <View style={[styles.swatch, { backgroundColor: t.light.bg, borderWidth: 1, borderColor: c.border }]} />
                </View>
                <View style={styles.themeNameRow}>
                  <Text style={[styles.themeName, { color: c.text }]}>{t.label}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={16} color={c.accent} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Modo */}
      <View style={{ gap: 12 }}>
        <Text style={[styles.label, { color: c.textDim }]}>Modo</Text>
        <View style={[styles.segment, { backgroundColor: c.surface2, borderColor: c.border }]}>
          {MODES.map((m) => {
            const on = mode === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => setMode(m.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.segmentItem, on && { backgroundColor: c.accent }]}
              >
                <Text style={[styles.segmentText, { color: on ? c.accentContrast : c.textDim }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" },
  themeCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 11,
  },
  swatches: { flexDirection: "row", gap: 5 },
  swatch: { width: 22, height: 22, borderRadius: 6 },
  themeNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeName: { fontSize: 14, fontWeight: "700" },
  segment: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  segmentText: { fontSize: 13, fontWeight: "600" },
});
