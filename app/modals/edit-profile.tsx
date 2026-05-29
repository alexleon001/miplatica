import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { useProfile, useUpdateProfile } from "../../lib/hooks/use-profile";
import { useCurrencyStore } from "../../lib/store/currency";
import { colors } from "../../lib/colors";

type UsdType = "mep" | "blue" | "oficial" | "ccl" | "tarjeta";
type Display = "ars" | "usd" | "both";

const USD_OPTIONS: { value: UsdType; label: string }[] = [
  { value: "mep", label: "MEP" },
  { value: "blue", label: "Blue" },
  { value: "oficial", label: "Oficial" },
  { value: "ccl", label: "CCL" },
  { value: "tarjeta", label: "Tarjeta" },
];

const DISPLAY_OPTIONS: { value: Display; label: string }[] = [
  { value: "ars", label: "Solo ARS" },
  { value: "usd", label: "Solo USD" },
  { value: "both", label: "Ambas" },
];

function parseNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

export default function EditProfileModal() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const setUsdTypeStore = useCurrencyStore((s) => s.setUsdType);

  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [usdType, setUsdType] = useState<UsdType>("mep");
  const [display, setDisplayState] = useState<Display>("both");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setIncome(profile.monthly_income_ars != null ? String(profile.monthly_income_ars) : "");
    setUsdType((profile.preferred_usd_type as UsdType) ?? "mep");
    setDisplayState((profile.currency_display as Display) ?? "both");
  }, [profile]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta tu nombre", "Ponete un alias o nombre.");
      return;
    }
    const incomeNum = income.trim() === "" ? null : parseNum(income);
    if (incomeNum != null && (Number.isNaN(incomeNum) || incomeNum < 0)) {
      Alert.alert("Ingreso inválido", "Usá solo números (ej: 2100000).");
      return;
    }

    try {
      await update.mutateAsync({
        name: name.trim(),
        monthly_income_ars: incomeNum,
        preferred_usd_type: usdType,
        currency_display: display,
      });
      // Mantener el store de moneda en sync con el perfil (igual que el layout).
      setUsdTypeStore(usdType);
      setDisplay(display);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el perfil.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Editar perfil" }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <Field label="¿Cómo te llamamos?">
          <TextInput
            style={styles.input}
            placeholder="Alex"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </Field>

        <Field label="Ingreso mensual (ARS)">
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={income}
            onChangeText={setIncome}
          />
          <Text style={styles.hint}>Se usa como sueldo neto por defecto en la proyección de pagos.</Text>
        </Field>

        <Field label="Dólar preferido">
          <View style={styles.row}>
            {USD_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, usdType === opt.value && styles.chipActive]}
                onPress={() => setUsdType(opt.value)}
              >
                <Text style={[styles.chipText, usdType === opt.value && styles.chipTextActive]}>{opt.label}</Text>
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
                onPress={() => setDisplayState(opt.value)}
              >
                <Text style={[styles.chipText, display === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Pressable
          style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, update.isPending && { opacity: 0.5 }]}
          onPress={submit}
          disabled={update.isPending}
        >
          <Text style={styles.submitText}>{update.isPending ? "Guardando…" : "Guardar cambios"}</Text>
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
  hint: { color: colors.textMuted, fontSize: 12 },
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
  submit: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
