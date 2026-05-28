import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useCreateDebt } from "../../lib/hooks/use-debts";
import { colors } from "../../lib/colors";

type DebtType = "credit_card" | "loan" | "informal" | "cuotas";
type DebtCurrency = "ARS" | "USD";

const TYPES: { value: DebtType; label: string }[] = [
  { value: "credit_card", label: "Tarjeta" },
  { value: "loan", label: "Préstamo" },
  { value: "cuotas", label: "Cuotas" },
  { value: "informal", label: "Informal" },
];

const CURRENCIES: DebtCurrency[] = ["ARS", "USD"];

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

export default function AddDebtModal() {
  const router = useRouter();
  const create = useCreateDebt();

  const [name, setName] = useState("");
  const [type, setType] = useState<DebtType>("credit_card");
  const [currency, setCurrency] = useState<DebtCurrency>("ARS");
  const [total, setTotal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [nextPayment, setNextPayment] = useState("");

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre (ej: Visa Galicia, Préstamo auto).");
      return;
    }
    const totalNum = parseNum(total);
    if (!total.trim() || Number.isNaN(totalNum) || totalNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá el total de la deuda (mayor a cero).");
      return;
    }
    const remainingNum = remaining.trim() ? parseNum(remaining) : totalNum;
    if (Number.isNaN(remainingNum) || remainingNum < 0) {
      Alert.alert("Saldo inválido", "El saldo restante tiene que ser un número válido.");
      return;
    }

    try {
      await create.mutateAsync({
        name: name.trim(),
        type,
        currency,
        total_amount: totalNum,
        remaining_amount: remainingNum,
        interest_rate: interestRate.trim() ? parseNum(interestRate) : null,
        monthly_payment: monthlyPayment.trim() ? parseNum(monthlyPayment) : null,
        next_payment_date: nextPayment.trim() ? nextPayment.trim() : null,
      });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la deuda.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Nueva deuda" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Field label="Nombre">
            <TextInput
              style={styles.input}
              placeholder="Visa Galicia, Préstamo auto…"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Field label="Tipo">
            <View style={styles.row}>
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[styles.chip, type === t.value && styles.chipActive]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Moneda">
            <View style={styles.row}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, currency === c && styles.chipActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={`Total de la deuda (${currency})`}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={total}
              onChangeText={setTotal}
            />
          </Field>

          <Field label="Saldo restante (opcional, default = total)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={remaining}
              onChangeText={setRemaining}
            />
          </Field>

          <Field label="Tasa anual % (opcional)">
            <TextInput
              style={styles.input}
              placeholder="ej: 120"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={interestRate}
              onChangeText={setInterestRate}
            />
          </Field>

          <Field label="Cuota mensual (opcional)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={monthlyPayment}
              onChangeText={setMonthlyPayment}
            />
          </Field>

          <Field label="Próximo vencimiento (AAAA-MM-DD, opcional)">
            <TextInput
              style={styles.input}
              placeholder="2026-06-10"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={nextPayment}
              onChangeText={setNextPayment}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, create.isPending && { opacity: 0.5 }]}
            onPress={submit}
            disabled={create.isPending}
          >
            <Text style={styles.submitText}>{create.isPending ? "Guardando…" : "Guardar deuda"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 16 },
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.textPrimary },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
