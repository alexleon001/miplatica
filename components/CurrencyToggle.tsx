// Selector de moneda del rediseño "Línea": local/USD/Ambas como UNDERLINE TABS
// (activo = texto acento + borde inferior 2px). Cuando no es local, debajo aparece
// el tipo de dólar (MEP/Blue/… en AR, BCV/Paralelo en VE) como pills discretas.
// La etiqueta de la moneda local y los tipos de dólar salen de la config de país.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { countryConfig } from "../lib/countries";
import {
  type CurrencyDisplay,
  useCurrencyStore,
} from "../lib/store/currency";
import { useTheme } from "../lib/theme-context";

export function CurrencyToggle() {
  const c = useTheme();
  const country = useCurrencyStore((s) => s.country);
  const display = useCurrencyStore((s) => s.display);
  const usdType = useCurrencyStore((s) => s.usdType);
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const setUsdType = useCurrencyStore((s) => s.setUsdType);

  const cfg = countryConfig(country);
  const displayOptions: { value: CurrencyDisplay; label: string }[] = [
    { value: "ars", label: cfg.currencyLabel },
    { value: "usd", label: "USD" },
    { value: "both", label: "Ambas" },
  ];

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {displayOptions.map((opt) => {
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
          {cfg.usdTypes.map((opt) => {
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
