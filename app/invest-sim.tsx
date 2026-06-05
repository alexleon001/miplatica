// Simulador / comparador de inversiones: proyecta un capital a N meses en plazo
// fijo, FCI money market y dólar MEP, y compara el rendimiento REAL (ajustado por
// inflación, regla #5). Las tasas y la inflación mensual son editables (la
// inflación se prefilla con el promedio reciente del IPC). Lógica pura
// lib/invest-sim. Respeta el CurrencyToggle (USD vía MEP del día). OTA-safe.

import { type ReactNode, useMemo, useState } from "react";
import { ScrollView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MoneyAmount } from "../components/MoneyAmount";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useInflation } from "../lib/hooks/use-inflation";
import { simulate, suggestedMonthlyInflation, type SimInstrument } from "../lib/invest-sim";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

const HORIZONS = [3, 6, 12, 24];
const DEFAULT_INFLATION = "2.5"; // fallback si no hay IPC cargado

function num(s: string): number {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function InvestSimScreen() {
  const router = useRouter();
  const { data: rates } = useExchangeRates();
  const { data: ipc } = useInflation();

  const suggestedInfl = useMemo(() => suggestedMonthlyInflation(ipc ?? []), [ipc]);

  const [amount, setAmount] = useState("100000");
  const [months, setMonths] = useState(12);
  const [inflation, setInflation] = useState<string | null>(null); // null = usar sugerido
  const [ptfRate, setPtfRate] = useState("35"); // plazo fijo TNA
  const [fciRate, setFciRate] = useState("30"); // FCI money market TNA
  const [usdRate, setUsdRate] = useState("0"); // rendimiento en USD (holding = 0)

  const inflPct = inflation != null ? num(inflation) : suggestedInfl ?? num(DEFAULT_INFLATION);
  const amountArs = num(amount);

  const instruments: SimInstrument[] = [
    { id: "fixed_term", label: "Plazo fijo", annualRatePct: num(ptfRate), currency: "ARS" },
    { id: "fci_mm", label: "FCI money market", annualRatePct: num(fciRate), currency: "ARS" },
    { id: "usd_mep", label: "Dólar MEP", annualRatePct: num(usdRate), currency: "USD" },
  ];

  const results = useMemo(
    () => (amountArs > 0 ? simulate(amountArs, months, inflPct, instruments) : []),
    [amountArs, months, inflPct, ptfRate, fciRate, usdRate],
  );

  const mep = rates?.mep ?? null;
  const toUsd = (ars: number) => (mep && mep > 0 ? ars / mep : null);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Simulador", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={colors.primaryBright} />
          </Pressable>
        </View>

        <Text style={styles.title}>Simulador de inversiones</Text>
        <Text style={styles.subtitle}>¿Dónde le gana a la inflación? Ajustá las tasas a tu realidad.</Text>

        {/* Parámetros */}
        <View style={styles.card}>
          <Field label="Capital (ARS)">
            <TextInput
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </Field>

          <Text style={styles.fieldLabel}>Plazo</Text>
          <View style={styles.chipRow}>
            {HORIZONS.map((h) => (
              <Chip key={h} label={`${h} meses`} active={months === h} onPress={() => setMonths(h)} />
            ))}
          </View>

          <Field label="Inflación mensual estimada (%)" hint={suggestedInfl != null ? `Sugerido por IPC reciente: ${suggestedInfl.toFixed(1)}%` : "No hay IPC cargado; ajustá a mano"}>
            <TextInput
              keyboardType="decimal-pad"
              value={inflation ?? (suggestedInfl != null ? suggestedInfl.toFixed(1) : DEFAULT_INFLATION)}
              onChangeText={setInflation}
              style={styles.input}
            />
          </Field>

          <View style={styles.ratesRow}>
            <RateField label="Plazo fijo TNA %" value={ptfRate} onChange={setPtfRate} />
            <RateField label="FCI MM TNA %" value={fciRate} onChange={setFciRate} />
            <RateField label="USD anual %" value={usdRate} onChange={setUsdRate} />
          </View>
        </View>

        {/* Resultados */}
        <Text style={styles.sectionLabel}>A {months} meses</Text>
        {results.length === 0 ? (
          <Text style={styles.empty}>Ingresá un capital para simular.</Text>
        ) : (
          results.map((r, i) => (
            <View key={r.id} style={[styles.resultCard, i === 0 && styles.winnerCard]}>
              <View style={styles.resultHead}>
                <View style={styles.resultTitleWrap}>
                  {i === 0 ? <Ionicons name="trophy" size={15} color={colors.warning} /> : null}
                  <Text style={styles.resultTitle}>{r.label}</Text>
                </View>
                <View style={[styles.realBadge, { backgroundColor: (r.beatsInflation ? colors.positive : colors.negative) + "22" }]}>
                  <Text style={[styles.realBadgeText, { color: r.beatsInflation ? colors.positive : colors.negative }]}>
                    real {r.realGainPct >= 0 ? "+" : ""}{r.realGainPct.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.resultBody}>
                <View style={styles.resultCol}>
                  <Text style={styles.resultColLabel}>Valor nominal</Text>
                  <MoneyAmount ars={Math.round(r.nominalArs)} usd={toUsd(r.nominalArs)} size="md" />
                  <Text style={styles.nominalPct}>+{r.nominalGainPct.toFixed(0)}% nominal</Text>
                </View>
                <View style={styles.resultCol}>
                  <Text style={styles.resultColLabel}>En pesos de hoy</Text>
                  <MoneyAmount ars={Math.round(r.realArs)} usd={toUsd(r.realArs)} size="md" tone={r.beatsInflation ? "positive" : "negative"} />
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={styles.disclaimer}>
          Estimación orientativa: capitalización mensual, el dólar se asume que acompaña la inflación.
          No es asesoramiento financiero. Las tasas reales varían día a día.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function RateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.rateField}>
      <Text style={styles.rateLabel}>{label}</Text>
      <TextInput keyboardType="decimal-pad" value={value} onChangeText={onChange} style={styles.rateInput} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.overline, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textMuted },
  input: {
    backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  ratesRow: { flexDirection: "row", gap: spacing.sm },
  rateField: { flex: 1, gap: spacing.xs },
  rateLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  rateInput: {
    backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    textAlign: "center",
  },
  sectionLabel: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  resultCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  winnerCard: { borderColor: colors.warning, backgroundColor: colors.surfaceElevated },
  resultHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultTitleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  resultTitle: { ...typography.heading, color: colors.textPrimary },
  realBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  realBadgeText: { fontSize: 12, fontWeight: "800" },
  resultBody: { flexDirection: "row", gap: spacing.lg },
  resultCol: { flex: 1, gap: 2 },
  resultColLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  nominalPct: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  disclaimer: { ...typography.caption, color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, lineHeight: 16 },
});
