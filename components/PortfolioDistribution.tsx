// Distribución del portafolio por tipo de instrumento.
// Barra horizontal apilada (proporcional al valor en ARS) + leyenda con %.
// Agrega server-side vía la vista SQL `v_portfolio_by_type` (usePortfolioByType).
// Rediseño "Línea": sin caja dura, label overline + barra + leyenda; useTheme().

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { instrumentById } from "../lib/instruments";
import { usePortfolioByType } from "../lib/hooks/use-portfolio-by-type";
import { useTheme } from "../lib/theme-context";

const pctFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

type Slice = { type: string; label: string; color: string; pct: number };

export function PortfolioDistribution() {
  const c = useTheme();

  const { data: rows } = usePortfolioByType();

  const slices = useMemo<Slice[]>(
    () =>
      (rows ?? []).map((r) => {
        const instrument = instrumentById(r.type);
        return {
          type: r.type,
          label: instrument?.label ?? r.type,
          color: instrument?.color ?? c.textFaint,
          pct: r.pct,
        };
      }),
    [rows, c.textFaint],
  );

  if (slices.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.label, { color: c.textDim }]}>Distribución</Text>

      <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
        {slices.map((s, i) => (
          <View
            key={s.type}
            style={{ flex: s.pct, backgroundColor: s.color, marginLeft: i === 0 ? 0 : 2 }}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.type} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={[styles.legendLabel, { color: c.text }]} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={[styles.legendPct, { color: c.textDim }]}>{pctFmt.format(s.pct)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  bar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  legend: { gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  legendPct: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
