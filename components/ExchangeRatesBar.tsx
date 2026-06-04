// Barra inferior con todas las cotizaciones del día. Resalta la elegida
// en el CurrencyToggle (useCurrencyStore.usdType).

import { StyleSheet, Text, View } from "react-native";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useCurrencyStore } from "../lib/store/currency";
import { colors, radius, shadow } from "../lib/theme";

type Rate = "oficial" | "mep" | "blue" | "ccl";

const RATE_LABELS: Record<Rate, string> = {
  oficial: "Oficial",
  mep: "MEP",
  blue: "Blue",
  ccl: "CCL",
};

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function ExchangeRatesBar() {
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  item: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  itemActive: { backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.usd },
  itemLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5 },
  itemLabelActive: { color: colors.usd },
  itemValue: { color: colors.textPrimary, fontSize: 13, fontWeight: "600", marginTop: 2 },
  itemValueActive: { color: colors.usd },
});
