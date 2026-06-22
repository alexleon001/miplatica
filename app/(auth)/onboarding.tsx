import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { ChipRow, FormChip, FormField, FormInput, SubmitButton } from "../../components/form";
import { useUpdateProfile } from "../../lib/hooks/use-profile";
import { COUNTRIES, COUNTRY_CODES, type CountryCode, type RateKey, countryConfig } from "../../lib/countries";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { spacing } from "../../lib/theme";

type Display = "ars" | "usd" | "both";

const DISPLAY_OPTIONS: { value: Display; label: string }[] = [
  { value: "ars", label: "Solo local" },
  { value: "usd", label: "Solo USD" },
  { value: "both", label: "Ambas" },
];

export default function OnboardingScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const updateProfile = useUpdateProfile();

  const [country, setCountry] = useState<CountryCode>("AR");
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [usdType, setUsdType] = useState<RateKey>(countryConfig("AR").defaultUsdType);
  const [display, setDisplay] = useState<Display>("both");

  const cfg = countryConfig(country);

  // Al cambiar de país, el tipo de dólar elegido puede no existir (AR↔VE no
  // comparten tasas) → reseteamos al default del nuevo país.
  function pickCountry(next: CountryCode) {
    setCountry(next);
    setUsdType(countryConfig(next).defaultUsdType);
  }

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
        country,
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

        <FormField label="¿Desde qué país usás Mi Platica?">
          <ChipRow>
            {COUNTRY_CODES.map((code) => (
              <FormChip
                key={code}
                label={`${COUNTRIES[code].flag} ${COUNTRIES[code].name}`}
                active={country === code}
                onPress={() => pickCountry(code)}
              />
            ))}
          </ChipRow>
        </FormField>

        <FormField label="¿Cómo te llamamos?">
          <FormInput placeholder="Alex" value={name} onChangeText={setName} />
        </FormField>

        <FormField label={`Ingreso mensual aproximado en ${cfg.currencyLabel} (opcional)`}>
          <FormInput placeholder="0" keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
        </FormField>

        <FormField label="¿Qué dólar preferís para calcular tu patrimonio?">
          <ChipRow>
            {cfg.usdTypes.map((opt) => (
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
