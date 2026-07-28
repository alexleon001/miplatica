// Card "Primeros pasos" del dashboard: checklist de activación para el usuario
// nuevo. Cada paso se deriva de los datos en vivo (tiene cuenta / movimiento /
// presupuesto) y abre el modal correspondiente al tocarlo. Se auto-oculta cuando
// están los tres hechos, o si el usuario lo descarta con la X (persistido).
//
// Solo pasos GRATIS y completables por cualquier usuario (no gateamos por Pro,
// para no dejar el card colgado para siempre en cuentas Free).

import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAccounts } from "../lib/hooks/use-accounts";
import { useBudgets } from "../lib/hooks/use-budgets";
import { useTransactions } from "../lib/hooks/use-transactions";
import { useFirstStepsStore } from "../lib/store/first-steps";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

type Step = { key: string; label: string; icon: IoniconName; done: boolean; route: string };

export function FirstSteps() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const dismissed = useFirstStepsStore((s) => s.dismissed);
  const dismiss = useFirstStepsStore((s) => s.dismiss);
  const { data: accounts } = useAccounts();
  const { data: txs } = useTransactions();
  const { data: budgets } = useBudgets();

  // No mostramos nada hasta saber el estado real: evita que el card aparezca un
  // instante a un usuario que SÍ tiene datos (queries cacheadas) antes de resolver.
  if (dismissed || accounts == null || txs == null || budgets == null) return null;

  const steps: Step[] = [
    { key: "account", label: "Agregá tu primera cuenta", icon: "wallet-outline", done: accounts.length > 0, route: "/modals/add-account" },
    { key: "tx", label: "Cargá tu primer movimiento", icon: "swap-horizontal-outline", done: txs.length > 0, route: "/modals/add-transaction" },
    { key: "budget", label: "Armá un presupuesto del mes", icon: "pie-chart-outline", route: "/modals/add-budget", done: budgets.length > 0 },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null; // todo hecho → ocultar

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="rocket-outline" size={16} color={c.accent} />
          <Text style={styles.title}>Primeros pasos</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Ocultar primeros pasos">
          <Ionicons name="close" size={18} color={c.textDim} />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        {doneCount} de {steps.length} · configurá Mi Plata en un minuto
      </Text>

      <View style={styles.steps}>
        {steps.map((step) => (
          <Pressable
            key={step.key}
            style={({ pressed }) => [styles.step, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(step.route)}
            disabled={step.done}
            accessibilityRole="button"
            accessibilityLabel={step.label}
            accessibilityState={{ checked: step.done }}
          >
            <Ionicons
              name={step.done ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={step.done ? c.pos : c.textDim}
            />
            <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]} numberOfLines={1}>
              {step.label}
            </Text>
            {step.done ? null : <Ionicons name="chevron-forward" size={18} color={c.textDim} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface2,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.27),
      gap: spacing.sm,
      ...shadow.sm,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    subtitle: { fontSize: 13, lineHeight: 18, color: c.textDim },
    steps: { marginTop: spacing.xs, gap: spacing.xs },
    step: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    stepLabel: { fontSize: 15, lineHeight: 21, color: c.text, flex: 1, fontWeight: "600" },
    stepLabelDone: { color: c.textDim, textDecorationLine: "line-through", fontWeight: "500" },
  });
}
