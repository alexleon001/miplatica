// Distribución del portafolio por tipo de instrumento.
// Barra horizontal apilada (proporcional al valor en ARS) + leyenda con %.
// Agrega client-side desde la lista de investments (sin vista SQL extra).

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { instrumentById } from "../lib/instruments";
import type { Investment } from "../lib/hooks/use-investments";
import { colors } from "../lib/colors";

const pctFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

type Slice = { type: string; label: string; color: string; value: number; pct: number };

export function PortfolioDistribution({ investments }: { investments: Investment[] }) {
  const slices = useMemo<Slice[]>(() => {
    const byType = new Map<string, number>();
    for (const inv of investments) {
      const v = inv.current_value_ars ?? 0;
      if (v <= 0) continue;
      byType.set(inv.type, (byType.get(inv.type) ?? 0) + v);
    }

    const total = [...byType.values()].reduce((a, b) => a + b, 0);
    if (total <= 0) return [];

    return [...byType.entries()]
      .map(([type, value]) => {
        const instrument = instrumentById(type);
        return {
          type,
          label: instrument?.label ?? type,
          color: instrument?.color ?? colors.border,
          value,
          pct: (value / total) * 100,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [investments]);

  if (slices.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Distribución</Text>

      <View style={styles.bar}>
        {slices.map((s) => (
          <View key={s.type} style={{ flex: s.pct, backgroundColor: s.color }} />
        ))}
      </View>

      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.type} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendPct}>{pctFmt.format(s.pct)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  label: { color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  bar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: colors.backgroundDark,
  },
  legend: { gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  legendPct: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
