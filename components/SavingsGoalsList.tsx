import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useDeleteGoal, useSavingsGoals } from "../lib/hooks/use-savings-goals";
import { confirmDelete } from "../lib/confirm";
import { CtaButton, ProgressBar } from "./ui";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

// Meses estimados para llegar a la meta con el aporte mensual declarado.
function etaMonths(remaining: number, monthly: number | null): number | null {
  if (!monthly || monthly <= 0 || remaining <= 0) return null;
  return Math.ceil(remaining / monthly);
}

export function SavingsGoalsList() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { data: goals, isLoading } = useSavingsGoals();
  const del = useDeleteGoal();
  const router = useRouter();

  const cta = (
    <CtaButton
      label="Agregar meta"
      icon="add"
      variant="outline"
      onPress={() => router.push("/modals/add-goal")}
    />
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
        const barColor = done ? c.pos : c.accent;

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
              {!done && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Aportar a ${g.name}`}
                  hitSlop={6}
                  onPress={() =>
                    router.push({
                      pathname: "/modals/quick-amount",
                      params: { kind: "contribution", id: g.id, name: g.name, currency: g.target_currency },
                    })
                  }
                  style={({ pressed }) => [styles.contribPill, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.contribPillText}>+ Aportar</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.amounts}>
              ${fmt.format(g.current_amount)} / ${fmt.format(g.target_amount)} {g.target_currency}
            </Text>
            <ProgressBar pct={pct} color={barColor} />
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    list: { gap: spacing.lg },
    muted: { fontSize: 13, color: c.textDim },
    row: { gap: spacing.sm },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
    label: { fontSize: 15, fontWeight: "700", color: c.text, flex: 1 },
    amounts: { fontSize: 13, color: c.textDim, fontVariant: ["tabular-nums"] },
    contribPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.33),
    },
    contribPillText: { color: c.accent, fontSize: 12, fontWeight: "700" },
    sub: { fontSize: 11, color: c.textDim },
  });
}
