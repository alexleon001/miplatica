import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CurrencyToggle } from "../../components/CurrencyToggle";
import { InvestmentRow } from "../../components/InvestmentRow";
import { MoneyAmount } from "../../components/MoneyAmount";
import { PnLBadge } from "../../components/PnLBadge";
import { PortfolioDistribution } from "../../components/PortfolioDistribution";
import { RowsSkeleton } from "../../components/Skeleton";
import { StateMessage } from "../../components/StateMessage";
import { freshenFci, freshenPlazoFijo, useDeleteInvestment, useInvestments } from "../../lib/hooks/use-investments";
import { useFciFundsBySlug } from "../../lib/hooks/use-fci-funds";
import { useInflation } from "../../lib/hooks/use-inflation";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { confirmDelete } from "../../lib/confirm";
import { realReturnForPosition } from "../../lib/inflation";
import { Card, Fab, ScreenTitle, SectionLabel } from "../../components/ui";
import { colors, spacing, typography } from "../../lib/theme";

export default function InvestmentsScreen() {
  const router = useRouter();
  const { data: investments, isLoading, isError, refetch } = useInvestments();
  const { data: inflationRows } = useInflation();
  const { data: rates } = useExchangeRates();
  const { refreshing, onRefresh } = usePullRefresh();
  const del = useDeleteInvestment();

  // Recalcula al vuelo: interés devengado de plazos fijos + VCP de hoy de los FCI.
  // La lista de FCI solo se trae si hay alguna posición FCI (evita red al montar).
  const mep = rates?.mep ?? null;
  const hasFci = useMemo(() => (investments ?? []).some((i) => i.type === "fci"), [investments]);
  const fciFundsBySlug = useFciFundsBySlug(hasFci);
  const positions = useMemo(
    () => (investments ?? []).map((inv) => freshenFci(freshenPlazoFijo(inv, mep), fciFundsBySlug, mep)),
    [investments, mep, fciFundsBySlug],
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
            <ScreenTitle>Inversiones</ScreenTitle>
            <CurrencyToggle />

            <Card style={styles.summaryCard}>
              <SectionLabel>Valor del portafolio</SectionLabel>
              <MoneyAmount ars={summary.valueArs} usd={summary.valueUsd} size="lg" />
              <View style={styles.summaryPnl}>
                <Text style={styles.summaryPnlLabel}>Resultado</Text>
                <PnLBadge pct={summary.plPct} realPct={summary.realPct} size="md" />
              </View>
            </Card>

            <PortfolioDistribution />

            <SectionLabel>Posiciones</SectionLabel>
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

      <Fab label="Nueva" onPress={() => router.push("/modals/add-investment")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  list: { padding: spacing.xl, paddingBottom: 100, gap: 0, flexGrow: 1 },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  summaryCard: { padding: spacing.xl, gap: spacing.sm },
  summaryPnl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
  },
  summaryPnlLabel: { ...typography.caption, color: colors.textMuted },
  separator: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 2 },
});
