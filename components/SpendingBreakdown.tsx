// Desglose de gastos por categoría del mes en curso (dónde se te va la plata).
// Sección colapsable en la tab Movimientos: muestra las categorías top con su % y
// una barra de proporción. Rediseño "Línea": sin caja dura, separada por hairline
// arriba/abajo; useTheme() para reaccionar al tema. Respeta el CurrencyToggle.

import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MoneyAmount } from "./MoneyAmount";
import { categoryById } from "../lib/categories";
import { useMonthSpending } from "../lib/hooks/use-month-spending";
import { topCategories } from "../lib/spending";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";

export function SpendingBreakdown() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useMonthSpending();

  // Sin gastos este mes: no mostramos la sección (la tab ya tiene su empty state).
  if (isLoading || !data || data.items.length === 0) return null;

  const rows = topCategories(data, 6);

  return (
    <View style={styles.card}>
      <Pressable style={styles.head} onPress={() => setOpen((v) => !v)} accessibilityLabel="Ver desglose de gastos por categoría">
        <View style={styles.headLeft}>
          <Ionicons name="pie-chart-outline" size={15} color={c.accent} />
          <Text style={styles.headTitle}>En qué gastás este mes</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textDim} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {rows.map((r) => {
            const cat = categoryById(r.category);
            return (
              <View key={r.category} style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {cat?.icon ?? "📦"} {cat?.label ?? r.category}
                  </Text>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowPct}>{Math.round(r.pct)}%</Text>
                    <MoneyAmount ars={r.ars} usd={r.usd} size="sm" />
                  </View>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.max(2, Math.min(100, r.pct))}%`, backgroundColor: cat?.color ?? c.accent },
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
    },
    headLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headTitle: { color: c.text, fontSize: 14, fontWeight: "600" },
    body: {
      paddingBottom: 16,
      gap: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 14,
    },
    row: { gap: 6 },
    rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    rowLabel: { color: c.text, fontSize: 13, fontWeight: "500", flex: 1 },
    rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    rowPct: { color: c.textDim, fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] },
    track: { height: 5, borderRadius: 3, backgroundColor: c.surface2, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 3 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 2,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    totalLabel: { color: c.text, fontSize: 13, fontWeight: "600" },
  });
}
