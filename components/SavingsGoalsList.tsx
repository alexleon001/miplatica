import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useDeleteGoal, useSavingsGoals } from "../lib/hooks/use-savings-goals";
import { confirmDelete } from "../lib/confirm";
import { colors } from "../lib/colors";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

// Meses estimados para llegar a la meta con el aporte mensual declarado.
function etaMonths(remaining: number, monthly: number | null): number | null {
  if (!monthly || monthly <= 0 || remaining <= 0) return null;
  return Math.ceil(remaining / monthly);
}

export function SavingsGoalsList() {
  const { data: goals, isLoading } = useSavingsGoals();
  const del = useDeleteGoal();
  const router = useRouter();

  const cta = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar meta de ahorro"
      style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
      onPress={() => router.push("/modals/add-goal")}
    >
      <Text style={styles.ctaText}>+ Agregar meta</Text>
    </Pressable>
  );

  if (isLoading) return <Text style={styles.muted}>Cargando metas…</Text>;

  if (!goals || goals.length === 0) {
    return (
      <View style={styles.list}>
        <Text style={styles.muted}>Todavía no tenés metas de ahorro. Creá la primera.</Text>
        {cta}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {goals.map((g) => {
        const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
        const done = g.current_amount >= g.target_amount && g.target_amount > 0;
        const remaining = Math.max(0, g.target_amount - g.current_amount);
        const eta = etaMonths(remaining, g.monthly_contribution);
        const barColor = done ? colors.positive : colors.primary;

        return (
          <Pressable
            key={g.id}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/modals/add-goal?id=${g.id}`)}
            onLongPress={() => confirmDelete(g.name, () => del.mutate(g.id))}
          >
            <View style={styles.head}>
              <Text style={styles.label} numberOfLines={1}>
                {done ? "✅ " : "🎯 "}
                {g.name}
              </Text>
              <Text style={styles.amounts}>
                ${fmt.format(g.current_amount)} / ${fmt.format(g.target_amount)} {g.target_currency}
              </Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.sub}>
              {done
                ? "¡Meta cumplida!"
                : `${Math.round(pct)}%${eta != null ? ` · ~${eta} ${eta === 1 ? "mes" : "meses"} al ritmo actual` : ""}`}
            </Text>
          </Pressable>
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
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", flex: 1 },
  amounts: { color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },
  barBg: { height: 6, backgroundColor: colors.border, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
  sub: { color: colors.textMuted, fontSize: 11 },
});
