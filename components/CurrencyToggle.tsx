// Selector de moneda del rediseño "Línea": ARS/USD/Ambas como UNDERLINE TABS
// (activo = texto acento + borde inferior 2px). Cuando no es ARS, debajo aparece
// el tipo de dólar (MEP/Blue/Oficial/CCL) como pills discretas. Usa useTheme().

import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  type CurrencyDisplay,
  type UsdType,
  useCurrencyStore,
} from "../lib/store/currency";
import { useTheme } from "../lib/theme-context";

const DISPLAY_OPTIONS: { value: CurrencyDisplay; label: string }[] = [
  { value: "ars", label: "ARS" },
  { value: "usd", label: "USD" },
  { value: "both", label: "Ambas" },
];

const USD_OPTIONS: { value: UsdType; label: string }[] = [
  { value: "mep", label: "MEP" },
  { value: "blue", label: "Blue" },
  { value: "oficial", label: "Oficial" },
  { value: "ccl", label: "CCL" },
];

export function CurrencyToggle() {
  const c = useTheme();
  const display = useCurrencyStore((s) => s.display);
  const usdType = useCurrencyStore((s) => s.usdType);
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const setUsdType = useCurrencyStore((s) => s.setUsdType);

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {DISPLAY_OPTIONS.map((opt) => {
          const on = display === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setDisplay(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.tab, on && { borderBottomColor: c.accent }]}
            >
              <Text style={[styles.tabText, { color: on ? c.accent : c.textDim, fontWeight: on ? "600" : "500" }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {display !== "ars" ? (
        <View style={styles.usdRow}>
          {USD_OPTIONS.map((opt) => {
            const on = usdType === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setUsdType(opt.value)}
                style={[styles.pill, { backgroundColor: c.surface2, borderColor: on ? c.accent : "transparent" }]}
              >
                <Text style={[styles.pillText, { color: on ? c.accent : c.textDim }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 24, borderBottomWidth: 1 },
  tab: { paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  tabText: { fontSize: 13 },
  usdRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: "600" },
});
