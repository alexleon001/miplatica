// Banner en Movimientos: si hay gastos/ingresos recurrentes sin registrar este
// mes, ofrece crearlos de un toque. Crea una transacción por plantilla pendiente
// y la marca como registrada en el período actual.

import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreateTransaction } from "../lib/hooks/use-create-transaction";
import { useRecurringStore } from "../lib/store/recurring";
import { currentPeriod, pendingTemplates, templateToTxInput } from "../lib/recurring";
import { useTheme } from "../lib/theme-context";
import { withAlpha } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

export function RecurringBanner() {
  const c = useTheme();
  const templates = useRecurringStore((s) => s.templates);
  const markRegistered = useRecurringStore((s) => s.markRegistered);
  const create = useCreateTransaction();
  const [busy, setBusy] = useState(false);

  const period = currentPeriod();
  const pending = pendingTemplates(templates, period);
  if (pending.length === 0) return null;

  async function registerAll() {
    if (busy) return;
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      for (const t of pending) {
        await create.mutateAsync(templateToTxInput(t, today));
        markRegistered(t.id, period);
      }
      Alert.alert("Listo", `Registré ${pending.length} movimiento${pending.length === 1 ? "" : "s"} recurrente${pending.length === 1 ? "" : "s"} de este mes.`);
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude registrar los recurrentes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, { backgroundColor: c.accentSoft, borderColor: withAlpha(c.accent, 0.33) }, (pressed || busy) && { opacity: 0.7 }]}
      onPress={registerAll}
      disabled={busy}
      accessibilityLabel="Registrar gastos recurrentes del mes"
    >
      {busy ? (
        <ActivityIndicator color={c.accent} size="small" />
      ) : (
        <Ionicons name="repeat" size={16} color={c.accent} />
      )}
      <Text style={[styles.text, { color: c.accent }]}>
        {busy
          ? "Registrando…"
          : `${pending.length} recurrente${pending.length === 1 ? "" : "s"} sin registrar · Registrar este mes`}
      </Text>
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
  text: { fontSize: 13, fontWeight: "700", flex: 1 },
});
