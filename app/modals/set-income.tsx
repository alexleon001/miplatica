import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FormInput, SubmitButton } from "../../components/form";
import {
  useClearProjectionIncome,
  useProjectionIncome,
  useSetProjectionIncome,
} from "../../lib/hooks/use-projection";
import { useProfile } from "../../lib/hooks/use-profile";
import { monthKey, monthLabel } from "../../lib/projection";
import { colors, spacing, typography } from "../../lib/theme";

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
          <FormInput
            placeholder={String(defaultIncome)}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          <SubmitButton label={setIncome.isPending ? "Guardando…" : "Guardar"} onPress={save} busy={setIncome.isPending} />

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
  container: { padding: spacing.xl, gap: spacing.md },
  month: { ...typography.title, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  fieldLabel: { ...typography.overline, color: colors.textMuted, marginTop: spacing.sm },
  reset: { paddingVertical: spacing.md, alignItems: "center" },
  resetText: { ...typography.caption, color: colors.textMuted, textDecorationLine: "underline" },
});
