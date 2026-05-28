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
import { useInvestments } from "../../lib/hooks/use-investments";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { colors } from "../../lib/colors";

export default function InvestmentsScreen() {
  const router = useRouter();
  const { data: investments, isLoading, isError, refetch } = useInvestments();
  const { refreshing, onRefresh } = usePullRefresh();

  const summary = useMemo(() => {
    const list = investments ?? [];
    let valueArs = 0;
    let valueUsd = 0;
    let plArs = 0;
    let costArs = 0;
    for (const inv of list) {
      valueArs += inv.current_value_ars ?? 0;
      valueUsd += inv.current_value_usd ?? 0;
      plArs += inv.profit_loss_ars ?? 0;
      costArs += (inv.current_value_ars ?? 0) - (inv.profit_loss_ars ?? 0);
    }
    const plPct = costArs > 0 ? (plArs / costArs) * 100 : null;
    return { valueArs, valueUsd, plArs, plPct };
  }, [investments]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={investments ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <InvestmentRow inv={item} />}
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
                <PnLBadge pct={summary.plPct} size="md" />
              </View>
            </View>

            <PortfolioDistribution investments={investments ?? []} />

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
