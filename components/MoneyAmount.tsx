// Componente único para renderizar montos. Consume useCurrencyStore para decidir
// si mostrar ARS, USD o ambas. Centraliza el formato es-AR (siempre).
// Patrón: pasale ambos amounts (ars + usd) y el componente decide qué mostrar.

import { StyleSheet, Text, View } from "react-native";
import { useCurrencyStore } from "../lib/store/currency";
import { colors } from "../lib/colors";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "positive" | "negative";

type MoneyAmountProps = {
  ars?: number | null;
  usd?: number | null;
  size?: Size;
  tone?: Tone;
};

const arsFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const usdFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const SIZES: Record<Size, { primary: number; secondary: number }> = {
  sm: { primary: 14, secondary: 11 },
  md: { primary: 20, secondary: 13 },
  lg: { primary: 32, secondary: 16 },
};

function toneColor(tone: Tone): string {
  switch (tone) {
    case "positive": return colors.positive;
    case "negative": return colors.negative;
    default:         return colors.textPrimary;
  }
}

export function MoneyAmount({ ars, usd, size = "md", tone = "default" }: MoneyAmountProps) {
  const display = useCurrencyStore((s) => s.display);
  const { primary, secondary } = SIZES[size];
  const primaryColor = toneColor(tone);

  const showArs = display === "ars" || display === "both";
  const showUsd = display === "usd" || display === "both";

  const arsText = ars == null ? "—" : arsFmt.format(ars);
  const usdText = usd == null ? "—" : usdFmt.format(usd);

  if (display === "ars") {
    return <Text style={[styles.primary, { fontSize: primary, color: primaryColor }]}>{arsText}</Text>;
  }
  if (display === "usd") {
    return <Text style={[styles.primary, { fontSize: primary, color: primaryColor }]}>{usdText}</Text>;
  }

  return (
    <View style={styles.stack}>
      {showArs && (
        <Text style={[styles.primary, { fontSize: primary, color: tone === "default" ? colors.ars : primaryColor }]}>
          {arsText}
        </Text>
      )}
      {showUsd && (
        <Text style={[styles.secondary, { fontSize: secondary, color: tone === "default" ? colors.usd : primaryColor }]}>
          {usdText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 2 },
  primary: { fontWeight: "700" },
  secondary: { fontWeight: "500" },
});
