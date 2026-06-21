// Evolución del patrimonio — rediseño "Línea": label "Evolución · N días" + delta
// + mini barras (Views puras, OTA-safe). Oculto hasta tener 5+ días. useTheme().

import { StyleSheet, Text, View } from "react-native";
import { useCurrencyStore } from "../lib/store/currency";
import { useNetWorthHistoryStore } from "../lib/store/networth-history";
import { chartBars, summarize } from "../lib/networth-history";
import { useTheme } from "../lib/theme-context";
import { MoneyAmount } from "./MoneyAmount";

const CHART_HEIGHT = 44;

export function NetWorthChart() {
  const c = useTheme();
  const display = useCurrencyStore((s) => s.display);
  const points = useNetWorthHistoryStore((s) => s.points);

  const useUsd = display === "usd";
  const series = points
    .map((p) => ({ date: p.date, v: useUsd ? p.usd : p.ars }))
    .filter((x): x is { date: string; v: number } => x.v != null);

  // Con 2-3 puntos las barras se ven raras: lo mostramos a partir de 5 días.
  if (series.length < 5) return null;

  const values = series.map((s) => s.v);
  const bars = chartBars(values);
  const sum = summarize(values)!;

  const arsSum = summarize(points.map((p) => p.ars));
  const usdVals = points.map((p) => p.usd).filter((x): x is number => x != null);
  const usdSum = usdVals.length >= 2 ? summarize(usdVals) : null;

  const up = sum.deltaAbs >= 0;
  const tone = up ? "positive" : "negative";
  const barColor = up ? c.pos : c.neg;
  const days = sum.count;

  return (
    <View style={{ gap: 14, paddingTop: 4 }}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: c.textDim }]}>Evolución · {days} {days === 1 ? "día" : "días"}</Text>
        <MoneyAmount ars={arsSum?.deltaAbs ?? 0} usd={usdSum?.deltaAbs ?? null} size="sm" tone={tone} />
      </View>

      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {bars.map((h, i) => (
          <View key={series[i].date} style={styles.barSlot}>
            <View
              style={{
                height: Math.max(2, h * CHART_HEIGHT),
                width: "100%",
                borderRadius: 3,
                backgroundColor: barColor,
                opacity: i === bars.length - 1 ? 1 : 0.5,
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 12.5, fontWeight: "500" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barSlot: { flex: 1, justifyContent: "flex-end" },
});
