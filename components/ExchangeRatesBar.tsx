// Barra inferior con todas las cotizaciones del día. Resalta la elegida
// en el CurrencyToggle (useCurrencyStore.usdType).

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { countryConfig } from "../lib/countries";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useCurrencyStore } from "../lib/store/currency";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, shadow } from "../lib/theme";

export function ExchangeRatesBar() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading } = useExchangeRates();
  const country = useCurrencyStore((s) => s.country);
  const activeUsdType = useCurrencyStore((s) => s.usdType);

  const cfg = countryConfig(country);
  const fmt = useMemo(() => new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 0 }), [cfg.locale]);
  // El shape de exchange_rates varía por país (columnas oficial/mep/… en AR,
  // bcv/paralelo en VE); accedemos por clave de forma laxa.
  const rates = data as Record<string, number | null> | undefined;

  return (
    <View style={styles.bar}>
      {cfg.usdTypes.map((opt) => {
        const active = opt.value === activeUsdType;
        const value = rates?.[opt.value];
        return (
          <View key={opt.value} style={[styles.item, active && styles.itemActive]}>
            <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
              {opt.label}
            </Text>
            <Text style={[styles.itemValue, active && styles.itemValueActive]}>
              {isLoading ? "..." : value != null ? `${cfg.currencySymbol}${fmt.format(value)}` : "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      ...shadow.sm,
    },
    item: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 6,
      alignItems: "center",
      borderRadius: radius.sm,
    },
    itemActive: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.accent },
    itemLabel: { color: c.textDim, fontSize: 11, letterSpacing: 0.5 },
    itemLabelActive: { color: c.accent },
    itemValue: { color: c.text, fontSize: 13, fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
    itemValueActive: { color: c.accent },
  });
}
