// Gestión de alertas de cotización del dólar. El usuario configura umbrales
// ("avisame si el MEP supera $X") que dispara use-rate-alerts cuando la
// cotización del día los cruza. Local por dispositivo (store rate-alerts).

import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useRateAlertsStore } from "../lib/store/rate-alerts";
import { useCurrencyStore } from "../lib/store/currency";
import { countryConfig } from "../lib/countries";
import { rateAlertSummary, rateLabel, type RateDirection, type RateType } from "../lib/rate-alerts";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

export default function RateAlertsScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data: rates } = useExchangeRates();
  const alerts = useRateAlertsStore((s) => s.alerts);
  const add = useRateAlertsStore((s) => s.add);
  const remove = useRateAlertsStore((s) => s.remove);

  // Las tasas ofrecidas dependen del país: dólares AR (MEP/blue/…) o BCV y
  // paralelo en Venezuela. El umbral se carga en moneda local.
  const country = useCurrencyStore((s) => s.country);
  const cfg = countryConfig(country);
  const rateOptions = useMemo(() => cfg.usdTypes.map((t) => t.value), [cfg]);
  const fmt = useMemo(
    () => new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 0 }),
    [cfg.locale],
  );
  const symbol = cfg.currencySymbol === "$" ? "$" : `${cfg.currencySymbol} `;

  const [rate, setRate] = useState<RateType>(cfg.defaultUsdType);
  const [direction, setDirection] = useState<RateDirection>("above");
  const [threshold, setThreshold] = useState("");

  function submit() {
    const num = Number(threshold.replace(/\./g, "").replace(",", "."));
    if (!threshold.trim() || Number.isNaN(num) || num <= 0) {
      Alert.alert("Valor inválido", "Ingresá un valor mayor a cero.");
      return;
    }
    add(rate, direction, num);
    setThreshold("");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Alertas de cotización", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={c.accent} />
          </Pressable>
        </View>

        <Text style={styles.title}>Alertas de cotización</Text>
        <Text style={styles.subtitle}>
          Te avisamos cuando el dólar cruza un valor. Se chequea cada vez que abrís la app.
        </Text>

        {/* Form de alta */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Dólar</Text>
          <View style={styles.chipRow}>
            {rateOptions.map((r) => (
              <Chip key={r} label={rateLabel(r)} active={rate === r} onPress={() => setRate(r)} />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Avisame cuando</Text>
          <View style={styles.chipRow}>
            <Chip label="Supera" active={direction === "above"} onPress={() => setDirection("above")} />
            <Chip label="Baja de" active={direction === "below"} onPress={() => setDirection("below")} />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Valor ({cfg.currencyLabel})</Text>
          <TextInput
            placeholder={rates?.[rate] != null ? `Hoy: ${symbol}${fmt.format(rates[rate]!)}` : "0"}
            placeholderTextColor={c.textDim}
            keyboardType="decimal-pad"
            value={threshold}
            onChangeText={setThreshold}
            style={styles.input}
          />

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }]}
            onPress={submit}
          >
            <Ionicons name="add" size={18} color={c.accentContrast} />
            <Text style={styles.submitText}>Agregar alerta</Text>
          </Pressable>
        </View>

        {/* Lista de alertas */}
        <Text style={styles.sectionLabel}>Tus alertas</Text>
        {alerts.length === 0 ? (
          <Text style={styles.empty}>No tenés alertas todavía. Creá una arriba.</Text>
        ) : (
          alerts.map((a) => {
            const current = rates?.[a.rate];
            return (
              <View key={a.id} style={styles.alertRow}>
                <View style={[styles.dot, { backgroundColor: a.direction === "above" ? c.pos : c.neg }]}>
                  <Ionicons
                    name={a.direction === "above" ? "arrow-up" : "arrow-down"}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertText}>{rateAlertSummary(a, country)}</Text>
                  <Text style={styles.alertHint}>
                    {current != null ? `Hoy: ${symbol}${fmt.format(current)}` : "Sin cotización"}
                    {a.triggered ? " · ✓ avisada" : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => remove(a.id)}
                  hitSlop={10}
                  accessibilityLabel="Borrar alerta"
                  style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={c.neg} />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
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
      marginTop: spacing.xs,
      ...shadow.sm,
    },
    fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim, marginBottom: spacing.sm },
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
    submit: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: c.accent,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      marginTop: spacing.md,
    },
    submitText: { color: c.accentContrast, fontWeight: "700", fontSize: 15 },
    sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim, marginTop: spacing.md },
    empty: { fontSize: 13, color: c.textDim, paddingVertical: spacing.md },
    alertRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      ...shadow.sm,
    },
    dot: { width: 30, height: 30, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
    alertText: { fontSize: 15, color: c.text, fontWeight: "600" },
    alertHint: { fontSize: 13, color: c.textDim, marginTop: 2 },
    delBtn: { padding: spacing.xs },
  });
}
