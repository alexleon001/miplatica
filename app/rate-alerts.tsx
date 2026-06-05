// Gestión de alertas de cotización del dólar. El usuario configura umbrales
// ("avisame si el MEP supera $X") que dispara use-rate-alerts cuando la
// cotización del día los cruza. Local por dispositivo (store rate-alerts).

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useRateAlertsStore } from "../lib/store/rate-alerts";
import { rateAlertSummary, rateLabel, type RateDirection, type RateType } from "../lib/rate-alerts";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

const RATES: RateType[] = ["oficial", "mep", "blue", "ccl"];
const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export default function RateAlertsScreen() {
  const router = useRouter();
  const { data: rates } = useExchangeRates();
  const alerts = useRateAlertsStore((s) => s.alerts);
  const add = useRateAlertsStore((s) => s.add);
  const remove = useRateAlertsStore((s) => s.remove);

  const [rate, setRate] = useState<RateType>("mep");
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
            <Ionicons name="chevron-back" size={24} color={colors.primaryBright} />
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
            {RATES.map((r) => (
              <Chip key={r} label={rateLabel(r)} active={rate === r} onPress={() => setRate(r)} />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Avisame cuando</Text>
          <View style={styles.chipRow}>
            <Chip label="Supera" active={direction === "above"} onPress={() => setDirection("above")} />
            <Chip label="Baja de" active={direction === "below"} onPress={() => setDirection("below")} />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Valor (ARS)</Text>
          <TextInput
            placeholder={rates?.[rate] != null ? `Hoy: $${fmt.format(rates[rate]!)}` : "0"}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={threshold}
            onChangeText={setThreshold}
            style={styles.input}
          />

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }]}
            onPress={submit}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
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
                <View style={[styles.dot, { backgroundColor: a.direction === "above" ? colors.positive : colors.negative }]}>
                  <Ionicons
                    name={a.direction === "above" ? "arrow-up" : "arrow-down"}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertText}>{rateAlertSummary(a)}</Text>
                  <Text style={styles.alertHint}>
                    {current != null ? `Hoy: $${fmt.format(current)}` : "Sin cotización"}
                    {a.triggered ? " · ✓ avisada" : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => remove(a.id)}
                  hitSlop={10}
                  accessibilityLabel="Borrar alerta"
                  style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.negative} />
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
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  fieldLabel: { ...typography.overline, color: colors.textMuted, marginBottom: spacing.sm },
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
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  sectionLabel: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  dot: { width: 30, height: 30, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  alertText: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  alertHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  delBtn: { padding: spacing.xs },
});
