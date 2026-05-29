// Modal reutilizable para acciones rápidas de monto:
//   - kind="payment"      → registrar pago de una deuda (descuenta del saldo)
//   - kind="contribution" → aportar a una meta de ahorro (suma a lo ahorrado)
//
// Recibe id + name + currency por params (para el copy); el monto autoritativo
// se relee dentro de la mutation, así no dependemos de data en cache stale.

import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRegisterDebtPayment } from "../../lib/hooks/use-debts";
import { useAddGoalContribution } from "../../lib/hooks/use-savings-goals";
import { colors } from "../../lib/colors";

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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {copy.label}
              {currency ? ` (${currency})` : ""}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, busy && { opacity: 0.5 }]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.submitText}>{busy ? "Guardando…" : copy.cta}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 16 },
  context: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  field: { gap: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
