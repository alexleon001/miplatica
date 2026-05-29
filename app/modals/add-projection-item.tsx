import { useEffect, useState } from "react";
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
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  useCreateProjectionItem,
  useProjectionItems,
  useUpdateProjectionItem,
} from "../../lib/hooks/use-projection";
import { monthKey } from "../../lib/projection";
import { colors } from "../../lib/colors";

type Recurrence = "monthly" | "installments" | "once";
type Currency = "ARS" | "USD";

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "monthly", label: "Mensual" },
  { value: "installments", label: "En cuotas" },
  { value: "once", label: "Único" },
];

const METHOD_SUGGESTIONS = ["TDC VISA", "TDC MASTER", "Mercado Pago", "Débito", "Efectivo", "Otros"];
const CURRENCIES: Currency[] = ["ARS", "USD"];

function parseNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function currentMonthInput(): string {
  return new Date().toISOString().slice(0, 7); // AAAA-MM
}

export default function AddProjectionItemModal() {
  const router = useRouter();
  const create = useCreateProjectionItem();
  const update = useUpdateProjectionItem();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const items = useProjectionItems();

  const [name, setName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Otros");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [recurrence, setRecurrence] = useState<Recurrence>("monthly");
  const [installments, setInstallments] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonthInput());

  useEffect(() => {
    if (!editing) return;
    const it = items.data?.find((x) => x.id === id);
    if (it) {
      setName(it.name);
      setPaymentMethod(it.payment_method);
      setAmount(String(it.amount));
      setCurrency(it.currency === "USD" ? "USD" : "ARS");
      setRecurrence(it.recurrence as Recurrence);
      setInstallments(it.installments_total != null ? String(it.installments_total) : "");
      setStartMonth(it.start_month.slice(0, 7));
    }
  }, [editing, id, items.data]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre (ej: Alquiler, Concierto, Internet).");
      return;
    }
    const amountNum = parseNum(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá el monto mensual del gasto (mayor a cero).");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(startMonth.trim())) {
      Alert.alert("Mes inválido", "El mes de inicio va en formato AAAA-MM (ej: 2026-06).");
      return;
    }
    let installmentsTotal: number | null = null;
    if (recurrence === "installments") {
      installmentsTotal = Math.round(parseNum(installments));
      if (!installments.trim() || Number.isNaN(installmentsTotal) || installmentsTotal <= 0) {
        Alert.alert("Cuotas inválidas", "Ingresá cuántas cuotas son (ej: 6).");
        return;
      }
    }

    const payload = {
      name: name.trim(),
      payment_method: paymentMethod.trim() || "Otros",
      amount: amountNum,
      currency,
      recurrence,
      installments_total: installmentsTotal,
      start_month: monthKey(`${startMonth.trim()}-01`),
    };

    try {
      if (editing) await update.mutateAsync({ id: id!, patch: payload });
      else await create.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el gasto.");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? "Editar gasto" : "Nuevo gasto proyectado" }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <Field label="Nombre">
            <TextInput
              style={styles.input}
              placeholder="Alquiler, Concierto, Internet…"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Field label="Medio de pago / grupo">
            <TextInput
              style={styles.input}
              placeholder="TDC VISA, Mercado Pago…"
              placeholderTextColor={colors.textMuted}
              value={paymentMethod}
              onChangeText={setPaymentMethod}
            />
            <View style={styles.row}>
              {METHOD_SUGGESTIONS.map((m) => (
                <Pressable key={m} style={styles.suggestChip} onPress={() => setPaymentMethod(m)}>
                  <Text style={styles.suggestText}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Moneda">
            <View style={styles.row}>
              {CURRENCIES.map((c) => (
                <Pressable key={c} style={[styles.chip, currency === c && styles.chipActive]} onPress={() => setCurrency(c)}>
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={`Monto por mes (${currency})`}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </Field>

          <Field label="Recurrencia">
            <View style={styles.row}>
              {RECURRENCES.map((r) => (
                <Pressable key={r.value} style={[styles.chip, recurrence === r.value && styles.chipActive]} onPress={() => setRecurrence(r.value)}>
                  <Text style={[styles.chipText, recurrence === r.value && styles.chipTextActive]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          {recurrence === "installments" && (
            <Field label="Cantidad de cuotas">
              <TextInput
                style={styles.input}
                placeholder="ej: 6"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={installments}
                onChangeText={setInstallments}
              />
            </Field>
          )}

          <Field label="Mes de inicio (AAAA-MM)">
            <TextInput
              style={styles.input}
              placeholder="2026-06"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={startMonth}
              onChangeText={setStartMonth}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, pending && { opacity: 0.5 }]}
            onPress={submit}
            disabled={pending}
          >
            <Text style={styles.submitText}>{pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar gasto"}</Text>
          </Pressable>
      </KeyboardAwareScrollView>
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
    backgroundColor: colors.surfaceDark, color: colors.textPrimary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, fontSize: 16,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.surfaceDark, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.textPrimary },
  suggestChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.primary + "22", borderWidth: 1, borderColor: colors.primary + "55",
  },
  suggestText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  submit: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
