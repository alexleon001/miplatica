import { useEffect, useMemo, useState } from "react";
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
import { categoriesByGroup, categoryById } from "../../lib/categories";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useCategorizeTransaction } from "../../lib/hooks/use-categorize-transaction";
import { useCreateTransaction } from "../../lib/hooks/use-create-transaction";
import { colors } from "../../lib/colors";

type TxType = "income" | "expense" | "transfer" | "investment";

const TYPES: { value: TxType; label: string }[] = [
  { value: "expense",    label: "Gasto" },
  { value: "income",     label: "Ingreso" },
  { value: "transfer",   label: "Transferencia" },
  { value: "investment", label: "Inversión" },
];

export default function AddTransactionModal() {
  const router = useRouter();
  const accounts = useAccounts();
  const create = useCreateTransaction();
  const categorize = useCategorizeTransaction();

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Default a la primera cuenta activa cuando carguen.
  useEffect(() => {
    if (!accountId && accounts.data && accounts.data.length > 0) {
      setAccountId(accounts.data[0].id);
    }
  }, [accounts.data, accountId]);

  const selectedAccount = useMemo(
    () => accounts.data?.find((a) => a.id === accountId) ?? null,
    [accounts.data, accountId],
  );

  const availableCategories = useMemo(() => {
    if (type === "income") return categoriesByGroup("income");
    if (type === "transfer") return categoriesByGroup("transfer");
    if (type === "investment") return categoriesByGroup("investment");
    return categoriesByGroup("expense");
  }, [type]);

  async function suggestWithAI() {
    if (!description.trim() || !amount.trim() || !selectedAccount) {
      Alert.alert("Faltan datos", "Necesito descripción, monto y cuenta para sugerir categoría.");
      return;
    }
    try {
      const result = await categorize.mutateAsync({
        description: description.trim(),
        amount: Number(amount.replace(",", ".")),
        currency: selectedAccount.currency,
        account_name: selectedAccount.name,
      });
      setCategoryId(result.category);
      if (result.merchant_normalized) {
        // mejor sugerencia para el title de la transacción
        setDescription((prev) => (prev === result.merchant_normalized ? prev : `${result.merchant_normalized}`));
      }
    } catch (e) {
      Alert.alert("Sin sugerencia", e instanceof Error ? e.message : "La IA no pudo categorizar.");
    }
  }

  async function submit() {
    if (!selectedAccount) {
      Alert.alert("Sin cuenta", "Agregá una cuenta primero (Dashboard → +).");
      return;
    }
    const amountNum = Number(amount.replace(",", "."));
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá un número mayor a cero.");
      return;
    }

    try {
      await create.mutateAsync({
        account_id: selectedAccount.id,
        type,
        category: categoryId ?? null,
        amount_ars: selectedAccount.currency === "ARS" ? amountNum : 0,
        amount_usd: selectedAccount.currency === "USD" ? amountNum : null,
        description: description.trim() || null,
        merchant: null,
        source: "manual",
      });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la transacción.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Nuevo movimiento" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Field label="Tipo">
            <View style={styles.row}>
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[styles.chip, type === t.value && styles.chipActive]}
                  onPress={() => { setType(t.value); setCategoryId(null); }}
                >
                  <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={`Monto (${selectedAccount?.currency ?? "—"})`}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </Field>

          <Field label="Descripción">
            <TextInput
              style={styles.input}
              placeholder='ej: "uber a casa", "carrefour"'
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.aiBtn,
              pressed && { opacity: 0.85 },
              categorize.isPending && { opacity: 0.5 },
            ]}
            onPress={suggestWithAI}
            disabled={categorize.isPending}
          >
            <Text style={styles.aiBtnText}>
              {categorize.isPending ? "Pensando…" : "✨ Sugerir categoría con IA"}
            </Text>
          </Pressable>

          <Field label="Cuenta">
            <View style={styles.row}>
              {accounts.data?.map((acc) => (
                <Pressable
                  key={acc.id}
                  style={[styles.chip, accountId === acc.id && styles.chipActive]}
                  onPress={() => setAccountId(acc.id)}
                >
                  <Text style={[styles.chipText, accountId === acc.id && styles.chipTextActive]}>
                    {acc.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Categoría">
            <View style={styles.row}>
              {availableCategories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, categoryId === c.id && styles.chipActive]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                    {c.icon} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {categoryId && categoryById(categoryId)?.label ? null : (
              <Text style={styles.hint}>Tocá una para elegir o usá ✨ IA arriba.</Text>
            )}
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.submit,
              pressed && { opacity: 0.85 },
              create.isPending && { opacity: 0.5 },
            ]}
            onPress={submit}
            disabled={create.isPending}
          >
            <Text style={styles.submitText}>
              {create.isPending ? "Guardando…" : "Guardar movimiento"}
            </Text>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.textPrimary },
  aiBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.primary + "22",
  },
  aiBtnText: { color: colors.primary, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
