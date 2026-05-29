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
import {
  useClearProjectionIncome,
  useProjectionIncome,
  useSetProjectionIncome,
} from "../../lib/hooks/use-projection";
import { useProfile } from "../../lib/hooks/use-profile";
import { monthKey, monthLabel } from "../../lib/projection";
import { colors } from "../../lib/colors";

function parseNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

export default function SetIncomeModal() {
  const router = useRouter();
  const { month } = useLocalSearchParams<{ month?: string }>();
  const key = monthKey(month ?? new Date().toISOString());
  const setIncome = useSetProjectionIncome();
  const clearIncome = useClearProjectionIncome();
  const { data: overrides } = useProjectionIncome();
  const { data: profile } = useProfile();

  const existing = overrides?.[key];
  const defaultIncome = profile?.monthly_income_ars ?? 0;
  const [amount, setAmount] = useState(existing != null ? String(existing) : "");

  async function save() {
    const n = parseNum(amount);
    if (!amount.trim() || Number.isNaN(n) || n < 0) {
      Alert.alert("Monto inválido", "Ingresá el sueldo neto de ese mes (en ARS).");
      return;
    }
    try {
      await setIncome.mutateAsync({ month: key, amountArs: n });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el ingreso.");
    }
  }

  async function reset() {
    try {
      await clearIncome.mutateAsync(key);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude quitar el ajuste.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Sueldo neto del mes" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <Text style={styles.month}>{monthLabel(key)}</Text>
          <Text style={styles.hint}>
            Por defecto se usa tu ingreso del perfil ({defaultIncome.toLocaleString("es-AR")} ARS). Ajustalo acá para
            meses puntuales (ej: aguinaldo).
          </Text>

          <Text style={styles.fieldLabel}>Sueldo neto (ARS)</Text>
          <TextInput
            style={styles.input}
            placeholder={String(defaultIncome)}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, setIncome.isPending && { opacity: 0.5 }]}
            onPress={save}
            disabled={setIncome.isPending}
          >
            <Text style={styles.submitText}>{setIncome.isPending ? "Guardando…" : "Guardar"}</Text>
          </Pressable>

          {existing != null && (
            <Pressable style={styles.reset} onPress={reset}>
              <Text style={styles.resetText}>Quitar ajuste (volver al ingreso del perfil)</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 12 },
  month: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 },
  input: {
    backgroundColor: colors.surfaceDark, color: colors.textPrimary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, fontSize: 18,
  },
  submit: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  reset: { paddingVertical: 12, alignItems: "center" },
  resetText: { color: colors.textMuted, fontSize: 13, textDecorationLine: "underline" },
});
