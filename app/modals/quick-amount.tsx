// Modal reutilizable para acciones rápidas de monto:
//   - kind="payment"      → registrar pago de una deuda (descuenta del saldo)
//   - kind="contribution" → aportar a una meta de ahorro (suma a lo ahorrado)
//
// Recibe id + name + currency por params (para el copy); el monto autoritativo
// se relee dentro de la mutation, así no dependemos de data en cache stale.

import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FormField, FormInput, SubmitButton } from "../../components/form";
import { useRegisterDebtPayment } from "../../lib/hooks/use-debts";
import { useAddGoalContribution } from "../../lib/hooks/use-savings-goals";
import { colors, spacing, typography } from "../../lib/theme";

type Kind = "payment" | "contribution";

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

const COPY: Record<Kind, { title: string; label: string; cta: string }> = {
  payment: { title: "Registrar pago", label: "Monto del pago", cta: "Registrar pago" },
  contribution: { title: "Aportar a la meta", label: "Monto del aporte", cta: "Aportar" },
};

export default function QuickAmountModal() {
  const router = useRouter();
  const { kind, id, name, currency } = useLocalSearchParams<{
    kind: Kind;
    id: string;
    name?: string;
    currency?: string;
  }>();

  const payment = useRegisterDebtPayment();
  const contribution = useAddGoalContribution();

  const [amount, setAmount] = useState("");

  const copy = COPY[kind] ?? COPY.payment;
  const busy = payment.isPending || contribution.isPending;

  async function submit() {
    const n = parseNum(amount);
    if (!amount.trim() || Number.isNaN(n) || n <= 0) {
      Alert.alert("Monto inválido", "Ingresá un monto mayor a cero.");
      return;
    }
    try {
      if (kind === "contribution") await contribution.mutateAsync({ id: id!, amount: n });
      else await payment.mutateAsync({ id: id!, amount: n });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la operación.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: copy.title }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          {name ? <Text style={styles.context} numberOfLines={1}>{name}</Text> : null}

          <FormField label={`${copy.label}${currency ? ` (${currency})` : ""}`}>
            <FormInput placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
          </FormField>

          <SubmitButton label={busy ? "Guardando…" : copy.cta} onPress={submit} busy={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, gap: spacing.lg },
  context: { ...typography.heading, color: colors.textPrimary },
});
