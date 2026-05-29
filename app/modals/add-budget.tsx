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
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { Stack, useRouter } from "expo-router";
import { categoriesByGroup } from "../../lib/categories";
import { useCreateBudget } from "../../lib/hooks/use-budgets";
import { colors } from "../../lib/colors";

const EXPENSE_CATEGORIES = categoriesByGroup("expense");

const monthFmt = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

export default function AddBudgetModal() {
  const router = useRouter();
  const create = useCreateBudget();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState("");

  async function submit() {
    if (!categoryId) {
      Alert.alert("Falta la categoría", "Elegí para qué categoría es el presupuesto.");
      return;
    }
    const limitNum = Number(limit.replace(",", "."));
    if (!limit.trim() || Number.isNaN(limitNum) || limitNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá un límite mayor a cero.");
      return;
    }

    try {
      await create.mutateAsync({ category: categoryId, limit_ars: limitNum });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el presupuesto.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Nuevo presupuesto" }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <Text style={styles.help}>
            Límite mensual para {monthFmt.format(new Date())}. El gasto se actualiza solo con tus movimientos.
          </Text>

          <Field label="Categoría">
            <View style={styles.row}>
              {EXPENSE_CATEGORIES.map((c) => (
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
          </Field>

          <Field label="Límite mensual (ARS)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={limit}
              onChangeText={setLimit}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, create.isPending && { opacity: 0.5 }]}
            onPress={submit}
            disabled={create.isPending}
          >
            <Text style={styles.submitText}>{create.isPending ? "Guardando…" : "Guardar presupuesto"}</Text>
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
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
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
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
