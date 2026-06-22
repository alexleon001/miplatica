// Barra inferior con todas las cotizaciones del día. Resalta la elegida
// en el CurrencyToggle (useCurrencyStore.usdType).

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useCurrencyStore } from "../lib/store/currency";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, shadow } from "../lib/theme";

type Rate = "oficial" | "mep" | "blue" | "ccl";

const RATE_LABELS: Record<Rate, string> = {
  oficial: "Oficial",
  mep: "MEP",
  blue: "Blue",
  ccl: "CCL",
};

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function ExchangeRatesBar() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading } = useExchangeRates();
  const activeUsdType = useCurrencyStore((s) => s.usdType);

  return (
    <View style={styles.bar}>
      {(Object.keys(RATE_LABELS) as Rate[]).map((rate) => {
        const active = rate === activeUsdType;
        const value = data?.[rate];
        return (
          <View key={rate} style={[styles.item, active && styles.itemActive]}>
            <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
              {RATE_LABELS[rate]}
            </Text>
            <Text style={[styles.itemValue, active && styles.itemValueActive]}>
              {isLoading ? "..." : value != null ? `$${fmt.format(value)}` : "—"}
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
