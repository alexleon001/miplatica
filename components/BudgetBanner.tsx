// Banner in-app del dashboard: avisa de presupuestos cerca del límite (≥80%) o
// excedidos. Visible aunque las notificaciones estén apagadas. Tocarlo lleva a
// "Más" (donde se editan los presupuestos).

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { categoryById } from "../lib/categories";
import { useBudgets } from "../lib/hooks/use-budgets";
import { budgetsAtRisk, currentPeriod } from "../lib/budget-alerts";
import { colors, radius, spacing, typography } from "../lib/theme";

export function BudgetBanner() {
  const router = useRouter();
  const { data: budgets } = useBudgets();
  const risks = budgetsAtRisk(budgets ?? [], currentPeriod());
  if (risks.length === 0) return null;

  const over = risks.filter((r) => r.over);
  const tint = over.length > 0 ? colors.negative : colors.warning;
  const names = risks
    .slice(0, 3)
    .map((r) => categoryById(r.category)?.label ?? r.category)
    .join(", ");

  const headline =
    over.length > 0
      ? `Te pasaste en ${over.length} presupuesto${over.length === 1 ? "" : "s"}`
      : `${risks.length} presupuesto${risks.length === 1 ? "" : "s"} cerca del límite`;

  return (
    <Pressable
      style={[styles.banner, { borderColor: tint + "55", backgroundColor: tint + "1A" }]}
      onPress={() => router.push("/(tabs)/more")}
      accessibilityLabel="Ver presupuestos"
    >
      <Ionicons name={over.length > 0 ? "alert-circle" : "warning-outline"} size={18} color={tint} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: tint }]}>{headline}</Text>
        <Text style={styles.detail} numberOfLines={1}>{names}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { ...typography.bodyStrong, fontSize: 14 },
  detail: { ...typography.caption, color: colors.textMuted },
});
