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
import { useRouter } from "expo-router";
import { useUpdateProfile } from "../../lib/hooks/use-profile";
import { colors } from "../../lib/colors";

type UsdType = "mep" | "blue" | "oficial" | "ccl" | "tarjeta";
type Display = "ars" | "usd" | "both";

const USD_OPTIONS: { value: UsdType; label: string }[] = [
  { value: "mep", label: "MEP" },
  { value: "blue", label: "Blue" },
  { value: "oficial", label: "Oficial" },
  { value: "ccl", label: "CCL" },
];

const DISPLAY_OPTIONS: { value: Display; label: string }[] = [
  { value: "ars", label: "Solo ARS" },
  { value: "usd", label: "Solo USD" },
  { value: "both", label: "Ambas" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [usdType, setUsdType] = useState<UsdType>("mep");
  const [display, setDisplay] = useState<Display>("both");

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta tu nombre", "Ponete un alias o nombre.");
      return;
    }
    const incomeNum = income.trim() === "" ? null : Number(income.replace(",", "."));
    if (incomeNum != null && Number.isNaN(incomeNum)) {
      Alert.alert("Ingreso inválido", "Usá solo números (opcional).");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        monthly_income_ars: incomeNum,
        preferred_usd_type: usdType,
        currency_display: display,
      });
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar tu perfil.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Bienvenido a Mi Platica</Text>
          <Text style={styles.subtitle}>
            Configurá tus preferencias en 30 segundos. Después podés cambiarlas en cualquier
            momento.
          </Text>

          <Field label="¿Cómo te llamamos?">
            <TextInput
              style={styles.input}
              placeholder="Alex"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Field label="Ingreso mensual aproximado en ARS (opcional)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={income}
              onChangeText={setIncome}
            />
          </Field>

          <Field label="¿Qué dólar preferís para calcular tu patrimonio?">
            <View style={styles.row}>
              {USD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, usdType === opt.value && styles.chipActive]}
                  onPress={() => setUsdType(opt.value)}
                >
                  <Text style={[styles.chipText, usdType === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="¿Cómo querés ver los montos?">
            <View style={styles.row}>
              {DISPLAY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, display === opt.value && styles.chipActive]}
                  onPress={() => setDisplay(opt.value)}
                >
                  <Text style={[styles.chipText, display === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.submit,
              pressed && { opacity: 0.85 },
              updateProfile.isPending && { opacity: 0.5 },
            ]}
            onPress={submit}
            disabled={updateProfile.isPending}
          >
            <Text style={styles.submitText}>
              {updateProfile.isPending ? "Guardando…" : "Empezar"}
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
  container: { padding: 24, gap: 18 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginTop: 12 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 12 },
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
    marginTop: 12,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
