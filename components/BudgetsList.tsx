import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { categoryById } from "../lib/categories";
import { useBudgets } from "../lib/hooks/use-budgets";
import { CtaButton, ProgressBar } from "./ui";
import { colors, spacing, typography } from "../lib/theme";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function BudgetsList() {
  const { data: budgets, isLoading } = useBudgets();
  const router = useRouter();

  const cta = (
    <CtaButton
      label="Agregar presupuesto"
      icon="add"
      variant="outline"
      onPress={() => router.push("/modals/add-budget")}
    />
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
            <ProgressBar pct={pct} color={barColor} />
          </View>
        );
      })}
      {cta}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  muted: { ...typography.caption, color: colors.textMuted },
  row: { gap: spacing.sm },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  amounts: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
});
