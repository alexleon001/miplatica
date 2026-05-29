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
import { useCreateGoal, useSavingsGoals, useUpdateGoal } from "../../lib/hooks/use-savings-goals";
import { colors } from "../../lib/colors";

type GoalCurrency = "ARS" | "USD";
const CURRENCIES: GoalCurrency[] = ["ARS", "USD"];

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

export default function AddGoalModal() {
  const router = useRouter();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const goals = useSavingsGoals();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<GoalCurrency>("ARS");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!editing) return;
    const g = goals.data?.find((x) => x.id === id);
    if (g) {
      setName(g.name);
      setCurrency(g.target_currency as GoalCurrency);
      setTarget(String(g.target_amount));
      setCurrent(String(g.current_amount));
      setMonthly(g.monthly_contribution != null ? String(g.monthly_contribution) : "");
      setTargetDate(g.target_date ?? "");
      setNotes(g.notes ?? "");
    }
  }, [editing, id, goals.data]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre a la meta (ej: Auto, Vacaciones).");
      return;
    }
    const targetNum = parseNum(target);
    if (!target.trim() || Number.isNaN(targetNum) || targetNum <= 0) {
      Alert.alert("Objetivo inválido", "Ingresá el monto objetivo (mayor a cero).");
      return;
    }
    const currentNum = current.trim() ? parseNum(current) : 0;
    if (Number.isNaN(currentNum) || currentNum < 0) {
      Alert.alert("Ahorro inválido", "Lo ahorrado tiene que ser un número válido.");
      return;
    }

    const payload = {
      name: name.trim(),
      target_currency: currency,
      target_amount: targetNum,
      current_amount: currentNum,
      monthly_contribution: monthly.trim() ? parseNum(monthly) : null,
      target_date: targetDate.trim() ? targetDate.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      if (editing) await update.mutateAsync({ id: id!, patch: payload });
      else await create.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la meta.");
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? "Editar meta" : "Nueva meta de ahorro" }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <Field label="Nombre">
            <TextInput
              style={styles.input}
              placeholder="Auto, Vacaciones, Fondo de emergencia…"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
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

          <Field label={`Objetivo (${currency})`}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={target}
              onChangeText={setTarget}
            />
          </Field>

          <Field label="Ya ahorrado (opcional)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={current}
              onChangeText={setCurrent}
            />
          </Field>

          <Field label="Aporte mensual (opcional)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={monthly}
              onChangeText={setMonthly}
            />
          </Field>

          <Field label="Fecha objetivo (AAAA-MM-DD, opcional)">
            <TextInput
              style={styles.input}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={targetDate}
              onChangeText={setTargetDate}
            />
          </Field>

          <Field label="Notas (opcional)">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="ej: para el viaje a Bariloche"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Field>

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, busy && { opacity: 0.5 }]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.submitText}>
              {busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar meta"}
            </Text>
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
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
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
