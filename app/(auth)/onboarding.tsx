import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { ChipRow, FormChip, FormField, FormInput, SubmitButton } from "../../components/form";
import { useUpdateProfile } from "../../lib/hooks/use-profile";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { spacing } from "../../lib/theme";

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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Bienvenido a Mi Platica</Text>
        <Text style={styles.subtitle}>
          Configurá tus preferencias en 30 segundos. Después podés cambiarlas en cualquier momento.
        </Text>

        <FormField label="¿Cómo te llamamos?">
          <FormInput placeholder="Alex" value={name} onChangeText={setName} />
        </FormField>

        <FormField label="Ingreso mensual aproximado en ARS (opcional)">
          <FormInput placeholder="0" keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
        </FormField>

        <FormField label="¿Qué dólar preferís para calcular tu patrimonio?">
          <ChipRow>
            {USD_OPTIONS.map((opt) => (
              <FormChip key={opt.value} label={opt.label} active={usdType === opt.value} onPress={() => setUsdType(opt.value)} />
            ))}
          </ChipRow>
        </FormField>

        <FormField label="¿Cómo querés ver los montos?">
          <ChipRow>
            {DISPLAY_OPTIONS.map((opt) => (
              <FormChip key={opt.value} label={opt.label} active={display === opt.value} onPress={() => setDisplay(opt.value)} />
            ))}
          </ChipRow>
        </FormField>

        <SubmitButton label={updateProfile.isPending ? "Guardando…" : "Empezar"} onPress={submit} busy={updateProfile.isPending} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing["2xl"], gap: spacing.lg },
    title: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.3, color: c.text, marginTop: spacing.md },
    subtitle: { fontSize: 15, lineHeight: 21, color: c.textDim, marginBottom: spacing.xs },
  });
}
