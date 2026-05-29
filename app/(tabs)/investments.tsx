import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CurrencyToggle } from "../../components/CurrencyToggle";
import { InvestmentRow } from "../../components/InvestmentRow";
import { MoneyAmount } from "../../components/MoneyAmount";
import { PnLBadge } from "../../components/PnLBadge";
import { PortfolioDistribution } from "../../components/PortfolioDistribution";
import { RowsSkeleton } from "../../components/Skeleton";
import { StateMessage } from "../../components/StateMessage";
import { freshenPlazoFijo, useDeleteInvestment, useInvestments } from "../../lib/hooks/use-investments";
import { useInflation } from "../../lib/hooks/use-inflation";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { confirmDelete } from "../../lib/confirm";
import { realReturnForPosition } from "../../lib/inflation";
import { colors } from "../../lib/colors";

export default function InvestmentsScreen() {
  const router = useRouter();
  const { data: investments, isLoading, isError, refetch } = useInvestments();
  const { data: inflationRows } = useInflation();
  const { data: rates } = useExchangeRates();
  const { refreshing, onRefresh } = usePullRefresh();
  const del = useDeleteInvestment();

  // Recalcula el interés devengado de plazos fijos al vuelo (ver freshenPlazoFijo).
  const mep = rates?.mep ?? null;
  const positions = useMemo(
    () => (investments ?? []).map((inv) => freshenPlazoFijo(inv, mep)),
    [investments, mep],
  );

  // Rendimiento real (ajustado por inflación, regla #5) por posición + agregado.
  // El agregado compone el costo de cada posición por su inflación acumulada
  // desde la compra y lo compara contra el valor actual en pesos.
  const { realByInvestment, summary } = useMemo(() => {
    const list = positions;
    const rows = inflationRows ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const realMap = new Map<string, number>();

    let valueArs = 0;
    let valueUsd = 0;
    let plArs = 0;
    let costArs = 0;
    let realGainArs = 0;     // suma de (valor − costo ajustado por inflación)
    let adjCostArs = 0;      // suma de costos ajustados por inflación (posiciones con dato)
    let hasReal = false;

    for (const inv of list) {
      valueArs += inv.current_value_ars ?? 0;
      valueUsd += inv.current_value_usd ?? 0;
      plArs += inv.profit_loss_ars ?? 0;
      costArs += (inv.current_value_ars ?? 0) - (inv.profit_loss_ars ?? 0);

      const r = realReturnForPosition(
        {
          currentValueArs: inv.current_value_ars,
          profitLossArs: inv.profit_loss_ars,
          since: inv.purchase_date ?? inv.created_at,
        },
        rows,
        today,
      );
      if (r) {
        realMap.set(inv.id, r.realPct);
        const cost = (inv.current_value_ars ?? 0) - (inv.profit_loss_ars ?? 0);
        const adjusted = cost * (1 + r.inflationPct / 100);
        adjCostArs += adjusted;
        realGainArs += (inv.current_value_ars ?? 0) - adjusted;
        hasReal = true;
      }
    }

    const plPct = costArs > 0 ? (plArs / costArs) * 100 : null;
    const realPct = hasReal && adjCostArs > 0 ? (realGainArs / adjCostArs) * 100 : null;
    return { realByInvestment: realMap, summary: { valueArs, valueUsd, plArs, plPct, realPct } };
  }, [positions, inflationRows]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={positions}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InvestmentRow
            inv={item}
            realPct={realByInvestment.get(item.id)}
            onPress={() => router.push(`/modals/add-investment?id=${item.id}`)}
            onLongPress={() => confirmDelete(item.name, () => del.mutate(item.id))}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Inversiones</Text>
            <CurrencyToggle />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Valor del portafolio</Text>
              <MoneyAmount ars={summary.valueArs} usd={summary.valueUsd} size="lg" />
              <View style={styles.summaryPnl}>
                <Text style={styles.summaryPnlLabel}>Resultado</Text>
                <PnLBadge pct={summary.plPct} realPct={summary.realPct} size="md" />
              </View>
            </View>

            <PortfolioDistribution />

            <Text style={styles.listLabel}>Posiciones</Text>
          </View>
        }
        ListEmptyComponent={
          isError ? (
            <StateMessage kind="error" message="No pude cargar las inversiones." onRetry={() => refetch()} />
          ) : isLoading ? (
            <RowsSkeleton count={5} />
          ) : (
            <StateMessage kind="empty" message="Todavía no cargaste inversiones. Sumá tu primera posición." />
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva inversión"
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/modals/add-investment")}
      >
        <Text style={styles.fabText}>+ Nueva</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  list: { padding: 20, paddingBottom: 100, gap: 0, flexGrow: 1 },
  header: { gap: 16, marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  summaryCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  summaryPnl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  summaryPnlLabel: { color: colors.textMuted, fontSize: 13 },
  listLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
});
