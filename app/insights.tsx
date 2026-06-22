// Insights de gastos: tendencia mensual de gasto vs ingreso (últimos 6 meses),
// comparación del mes actual contra el anterior y las categorías que más
// crecieron/bajaron. Gráfico de barras con Views puras (OTA-safe). Respeta el
// CurrencyToggle vía MoneyAmount. Datos: use-insights (lógica pura lib/insights).

import { useMemo } from "react";
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MoneyAmount } from "../components/MoneyAmount";
import { StateMessage } from "../components/StateMessage";
import { categoryById } from "../lib/categories";
import { useInsights } from "../lib/hooks/use-insights";
import { monthLabel } from "../lib/projection";
import type { CategoryDelta } from "../lib/insights";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

const CHART_HEIGHT = 100;

export default function InsightsScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useInsights();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Insights", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={c.accent} />
          </Pressable>
        </View>

        <Text style={styles.title}>Insights de gastos</Text>
        <Text style={styles.subtitle}>Tu tendencia de los últimos meses y qué cambió.</Text>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.accent} />
            <Text style={styles.loadingText}>Analizando tus movimientos…</Text>
          </View>
        ) : isError ? (
          <StateMessage kind="error" message="No pude cargar los insights." onRetry={() => refetch()} />
        ) : !data || data.series.every((m) => m.expenseArs === 0 && m.incomeArs === 0) ? (
          <StateMessage kind="empty" message="Cargá movimientos para ver tu tendencia." />
        ) : (
          <>
            {/* Tendencia del mes */}
            {data.trend ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Gasto de {monthLabel(data.currentPeriod, false)}</Text>
                <MoneyAmount ars={data.trend.current} usd={data.trend.currentUsd} size="lg" tone="negative" />
                <View style={styles.trendRow}>
                  <DeltaBadge deltaAbs={data.trend.deltaAbs} deltaPct={data.trend.deltaPct} invert />
                  <Text style={styles.trendHint}>vs. {monthLabel(data.previousPeriod, false)}</Text>
                </View>
                <Text style={styles.avgHint}>
                  Promedio últimos {data.series.length} meses: ${Math.round(data.trend.avgArs).toLocaleString("es-AR")}
                </Text>
              </View>
            ) : null}

            {/* Gráfico gasto vs ingreso */}
            <View style={styles.card}>
              <View style={styles.legendRow}>
                <Legend color={c.neg} label="Gasto" />
                <Legend color={c.pos} label="Ingreso" />
              </View>
              <MonthlyChart series={data.series} />
            </View>

            {/* Categorías que más cambiaron */}
            <Movers movers={data.movers} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MonthlyChart({ series }: { series: { period: string; expenseArs: number; incomeArs: number }[] }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const max = Math.max(1, ...series.flatMap((m) => [m.expenseArs, m.incomeArs]));
  return (
    <View style={styles.chart}>
      {series.map((m) => (
        <View key={m.period} style={styles.monthCol}>
          <View style={styles.bars}>
            <View style={[styles.bar, { height: Math.max(2, (m.expenseArs / max) * CHART_HEIGHT), backgroundColor: c.neg }]} />
            <View style={[styles.bar, { height: Math.max(2, (m.incomeArs / max) * CHART_HEIGHT), backgroundColor: c.pos }]} />
          </View>
          <Text style={styles.monthLabel}>{monthLabel(m.period, false).slice(0, 3)}</Text>
        </View>
      ))}
    </View>
  );
}

function Movers({ movers }: { movers: CategoryDelta[] }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  // Mostramos los que cambiaron (delta != 0), priorizando los de mayor variación
  // absoluta en cualquier dirección. Top 6.
  const changed = movers
    .filter((m) => Math.round(m.deltaAbs) !== 0)
    .sort((a, b) => Math.abs(b.deltaAbs) - Math.abs(a.deltaAbs))
    .slice(0, 6);

  if (changed.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Qué cambió vs. el mes pasado</Text>
      {changed.map((m) => {
        const cat = categoryById(m.category);
        return (
          <View key={m.category} style={styles.moverRow}>
            <Text style={styles.moverLabel} numberOfLines={1}>
              {cat?.icon ?? "📦"} {cat?.label ?? m.category}
            </Text>
            <View style={styles.moverRight}>
              <MoneyAmount ars={m.current} usd={m.currentUsd} size="sm" />
              <DeltaBadge deltaAbs={m.deltaAbs} deltaPct={m.deltaPct} invert />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Badge de variación. `invert`: para gasto, subir es malo (rojo) y bajar es
// bueno (verde) — al revés que el patrimonio.
function DeltaBadge({ deltaAbs, deltaPct, invert }: { deltaAbs: number; deltaPct: number | null; invert?: boolean }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const up = deltaAbs > 0;
  const good = invert ? !up : up;
  const color = deltaAbs === 0 ? c.textDim : good ? c.pos : c.neg;
  const arrow = deltaAbs === 0 ? "remove" : up ? "arrow-up" : "arrow-down";
  const pctText =
    deltaPct != null
      ? `${deltaPct >= 0 ? "+" : ""}${Math.round(deltaPct)}%`
      : up
        ? "nuevo"
        : "—";
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.13) }]}>
      <Ionicons name={arrow as keyof typeof Ionicons.glyphMap} size={11} color={color} />
      <Text style={[styles.badgeText, { color }]}>{pctText}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
    headerRow: { flexDirection: "row", alignItems: "center" },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    subtitle: { fontSize: 13, color: c.textDim, lineHeight: 18 },
    loading: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["3xl"] },
    loadingText: { fontSize: 13, color: c.textDim },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: spacing.sm,
      marginTop: spacing.xs,
      ...shadow.sm,
    },
    cardLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim },
    trendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
    trendHint: { fontSize: 13, color: c.textDim },
    avgHint: { fontSize: 13, color: c.textDim },
    legendRow: { flexDirection: "row", gap: spacing.lg },
    legend: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, color: c.textDim },
    chart: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: CHART_HEIGHT + 20,
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    monthCol: { flex: 1, alignItems: "center", gap: spacing.xs },
    bars: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: CHART_HEIGHT },
    bar: { width: 9, borderRadius: 2 },
    monthLabel: { fontSize: 10, color: c.textDim },
    moverRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    moverLabel: { fontSize: 15, color: c.text, flex: 1, fontWeight: "600" },
    moverRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    badgeText: { fontSize: 11, fontWeight: "800" },
  });
}
