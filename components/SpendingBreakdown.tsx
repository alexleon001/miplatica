// Desglose de gastos por categoría del mes en curso (dónde se te va la plata).
// Card colapsable en la tab Movimientos: muestra las categorías top con su % y
// una barra de proporción. Pura UI con Views (OTA-safe). Respeta el CurrencyToggle.

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MoneyAmount } from "./MoneyAmount";
import { categoryById } from "../lib/categories";
import { useMonthSpending } from "../lib/hooks/use-month-spending";
import { topCategories } from "../lib/spending";
import { colors, radius, spacing, typography } from "../lib/theme";

export function SpendingBreakdown() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useMonthSpending();

  // Sin gastos este mes: no mostramos la card (la tab ya tiene su empty state).
  if (isLoading || !data || data.items.length === 0) return null;

  const rows = topCategories(data, 6);

  return (
    <View style={styles.card}>
      <Pressable style={styles.head} onPress={() => setOpen((v) => !v)} accessibilityLabel="Ver desglose de gastos por categoría">
        <View style={styles.headLeft}>
          <Ionicons name="pie-chart-outline" size={15} color={colors.primaryBright} />
          <Text style={styles.headTitle}>En qué gastás este mes</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {rows.map((c) => {
            const cat = categoryById(c.category);
            return (
              <View key={c.category} style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {cat?.icon ?? "📦"} {cat?.label ?? c.category}
                  </Text>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowPct}>{Math.round(c.pct)}%</Text>
                    <MoneyAmount ars={c.ars} usd={c.usd} size="sm" />
                  </View>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.max(2, Math.min(100, c.pct))}%`, backgroundColor: cat?.color ?? colors.primary },
                    ]}
                  />
                </View>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total del mes</Text>
            <MoneyAmount ars={data.totalArs} usd={data.totalUsd} size="sm" tone="negative" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headTitle: { ...typography.bodyStrong, color: colors.textPrimary, fontSize: 14 },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
  },
  row: { gap: spacing.xs },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: "600", flex: 1 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowPct: { color: colors.textMuted, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSunken, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  totalLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
});
