// Distribución del portafolio por tipo de instrumento.
// Barra horizontal apilada (proporcional al valor en ARS) + leyenda con %.
// Agrega server-side vía la vista SQL `v_portfolio_by_type` (usePortfolioByType).

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { instrumentById } from "../lib/instruments";
import { usePortfolioByType } from "../lib/hooks/use-portfolio-by-type";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

const pctFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

type Slice = { type: string; label: string; color: string; pct: number };

export function PortfolioDistribution() {
  const { data: rows } = usePortfolioByType();

  const slices = useMemo<Slice[]>(
    () =>
      (rows ?? []).map((r) => {
        const instrument = instrumentById(r.type);
        return {
          type: r.type,
          label: instrument?.label ?? r.type,
          color: instrument?.color ?? colors.border,
          pct: r.pct,
        };
      }),
    [rows],
  );

  if (slices.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Distribución</Text>

      <View style={styles.bar}>
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
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  label: { ...typography.overline, color: colors.textMuted },
  bar: {
    flexDirection: "row",
    height: 14,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surfaceSunken,
  },
  legend: { gap: spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.caption, color: colors.textPrimary, flex: 1 },
  legendPct: { ...typography.caption, color: colors.textSecondary, fontWeight: "700" },
});
