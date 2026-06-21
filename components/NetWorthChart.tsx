// Mini-gráfico de evolución del patrimonio neto. Lee el historial local
// (lib/store/networth-history) y dibuja un sparkline de barras con Views puras
// (sin react-native-svg → OTA-safe). Respeta el CurrencyToggle: grafica la serie
// en la moneda elegida (ARS, o USD si está en vista USD).

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MoneyAmount } from "./MoneyAmount";
import { useCurrencyStore } from "../lib/store/currency";
import { useNetWorthHistoryStore } from "../lib/store/networth-history";
import { chartBars, summarize } from "../lib/networth-history";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

const CHART_HEIGHT = 56;

export function NetWorthChart() {
  const display = useCurrencyStore((s) => s.display);
  const points = useNetWorthHistoryStore((s) => s.points);

  // Serie a graficar en la moneda elegida (USD solo si la vista es USD).
  const useUsd = display === "usd";
  const series = points
    .map((p) => ({ date: p.date, v: useUsd ? p.usd : p.ars }))
    .filter((x): x is { date: string; v: number } => x.v != null);

  // Ocultamos el gráfico hasta tener suficientes días: con 2-3 puntos las barras se
  // ven raras (un par altas y el resto plano). A partir de 5 días ya cuenta algo.
  if (series.length < 5) return null;

  const values = series.map((s) => s.v);
  const bars = chartBars(values);
  const sum = summarize(values)!;

  // Deltas en ambas monedas para que MoneyAmount respete la vista (ARS/USD/ambas).
  const arsSum = summarize(points.map((p) => p.ars));
  const usdVals = points.map((p) => p.usd).filter((x): x is number => x != null);
  const usdSum = usdVals.length >= 2 ? summarize(usdVals) : null;

  const up = sum.deltaAbs >= 0;
  const tone = up ? "positive" : "negative";
  const barColor = up ? colors.positive : colors.negative;
  const days = sum.count;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <Ionicons name="analytics-outline" size={14} color={colors.primaryBright} />
          <Text style={styles.title}>Evolución · {days} {days === 1 ? "día" : "días"}</Text>
        </View>
        <View style={styles.deltaWrap}>
          <Ionicons
            name={up ? "trending-up" : "trending-down"}
            size={14}
            color={barColor}
          />
          <MoneyAmount ars={arsSum?.deltaAbs ?? 0} usd={usdSum?.deltaAbs ?? null} size="sm" tone={tone} />
          {sum.deltaPct != null && sum.first > 0 ? (
            <Text style={[styles.pct, { color: barColor }]}>
              {sum.deltaPct >= 0 ? "+" : ""}
              {sum.deltaPct.toFixed(1)}%
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.chart}>
        {bars.map((h, i) => (
          <View key={series[i].date} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                { height: Math.max(2, h * CHART_HEIGHT), backgroundColor: barColor + (i === bars.length - 1 ? "FF" : "99") },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headLeft: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { ...typography.overline, color: colors.textMuted },
  deltaWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  pct: { fontSize: 12, fontWeight: "800" },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    gap: 2,
  },
  barSlot: { flex: 1, justifyContent: "flex-end", alignItems: "stretch" },
  bar: { borderRadius: 2, width: "100%" },
});
