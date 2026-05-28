import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { categoryById } from "../lib/categories";
import { useBudgets } from "../lib/hooks/use-budgets";
import { colors } from "../lib/colors";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function BudgetsList() {
  const { data: budgets, isLoading } = useBudgets();
  const router = useRouter();

  const cta = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar presupuesto"
      style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
      onPress={() => router.push("/modals/add-budget")}
    >
      <Text style={styles.ctaText}>+ Agregar presupuesto</Text>
    </Pressable>
  );

  if (isLoading) {
    return <Text style={styles.muted}>Cargando presupuestos…</Text>;
  }
  if (!budgets || budgets.length === 0) {
    return (
      <View style={styles.list}>
        <Text style={styles.muted}>Aún no configuraste presupuestos. Creá el primero.</Text>
        {cta}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {budgets.map((b) => {
        const cat = categoryById(b.category);
        const pct = b.limit_ars > 0 ? Math.min(100, (b.spent_ars / b.limit_ars) * 100) : 0;
        const overBudget = b.spent_ars > b.limit_ars;
        const warning = pct >= 80 && !overBudget;
        const barColor = overBudget ? colors.negative : warning ? colors.warning : colors.positive;

        return (
          <View key={b.id} style={styles.row}>
            <View style={styles.head}>
              <Text style={styles.label}>
                {cat?.icon ?? "📦"} {cat?.label ?? b.category}
              </Text>
              <Text style={styles.amounts}>
                ${fmt.format(b.spent_ars)} / ${fmt.format(b.limit_ars)}
              </Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}
      {cta}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  muted: { color: colors.textMuted, fontSize: 13 },
  cta: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  ctaText: { color: colors.primary, fontWeight: "600" },
  row: { gap: 6 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  amounts: { color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },
  barBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999 },
});
