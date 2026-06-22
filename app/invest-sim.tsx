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
import { useLocalUsdRate } from "../lib/hooks/use-exchange-rates";
import { useInflation } from "../lib/hooks/use-inflation";
import { simulate, suggestedMonthlyInflation, type SimInstrument } from "../lib/invest-sim";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

const HORIZONS = [3, 6, 12, 24];
const DEFAULT_INFLATION = "2.5"; // fallback si no hay IPC cargado

// Parsea un número de un input numérico. Acepta formato AR (1.234,56) y formato
// con punto decimal del teclado decimal-pad (2.5). Heurística: la coma siempre es
// decimal; un punto seguido de exactamente 3 dígitos (sin coma) o varios puntos se
// tratan como separador de miles, si no el punto es decimal. Así "2.5" = 2.5 (no 25)
// y "100.000" = 100000. Antes se borraban TODOS los puntos → "2.5" caía a 25 (bug:
// la inflación 2.5% se interpretaba 25% mensual y reventaba el simulador).
function num(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  let normalized: string;
  if (t.includes(",")) {
    normalized = t.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = t.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = parts.join(""); // miles: 1.234.567 / 100.000
    } else {
      normalized = t; // decimal: 2.5 / 12.50
    }
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default function InvestSimScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const mep = useLocalUsdRate();
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

  const toUsd = (ars: number) => (mep && mep > 0 ? ars / mep : null);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Simulador", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={c.accent} />
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
              placeholderTextColor={c.textDim}
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
                  {i === 0 ? <Ionicons name="trophy" size={15} color={c.warn} /> : null}
                  <Text style={styles.resultTitle}>{r.label}</Text>
                </View>
                <View style={[styles.realBadge, { backgroundColor: withAlpha(r.beatsInflation ? c.pos : c.neg, 0.13) }]}>
                  <Text style={[styles.realBadgeText, { color: r.beatsInflation ? c.pos : c.neg }]}>
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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function RateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.rateField}>
      <Text style={styles.rateLabel}>{label}</Text>
      <TextInput keyboardType="decimal-pad" value={value} onChangeText={onChange} style={styles.rateInput} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
    headerRow: { flexDirection: "row", alignItems: "center" },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    subtitle: { fontSize: 13, color: c.textDim, lineHeight: 18 },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: spacing.md,
      marginTop: spacing.xs,
      ...shadow.sm,
    },
    field: { gap: spacing.sm },
    fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim },
    hint: { fontSize: 13, color: c.textDim },
    input: {
      backgroundColor: c.surface2,
      color: c.text,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 16,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.textDim, fontWeight: "600", fontSize: 13 },
    chipTextActive: { color: c.accentContrast },
    ratesRow: { flexDirection: "row", gap: spacing.sm },
    rateField: { flex: 1, gap: spacing.xs },
    rateLabel: { fontSize: 11, color: c.textDim },
    rateInput: {
      backgroundColor: c.surface2,
      color: c.text,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 15,
      textAlign: "center",
    },
    sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim, marginTop: spacing.md },
    empty: { fontSize: 13, color: c.textDim, paddingVertical: spacing.md },
    resultCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: spacing.md,
      marginTop: spacing.xs,
      ...shadow.sm,
    },
    winnerCard: { borderColor: c.warn, backgroundColor: c.surface2 },
    resultHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    resultTitleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    resultTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    realBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
    realBadgeText: { fontSize: 12, fontWeight: "800" },
    resultBody: { flexDirection: "row", gap: spacing.lg },
    resultCol: { flex: 1, gap: 2 },
    resultColLabel: { fontSize: 11, color: c.textDim },
    nominalPct: { fontSize: 11, color: c.textDim },
    disclaimer: { fontSize: 11, color: c.textDim, marginTop: spacing.sm, lineHeight: 16 },
  });
}
