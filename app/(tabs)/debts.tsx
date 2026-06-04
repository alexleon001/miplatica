import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CurrencyToggle } from "../../components/CurrencyToggle";
import { DebtItem } from "../../components/DebtItem";
import { MoneyAmount } from "../../components/MoneyAmount";
import { RowsSkeleton } from "../../components/Skeleton";
import { StateMessage } from "../../components/StateMessage";
import { useDebts, useDeleteDebt } from "../../lib/hooks/use-debts";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { confirmDelete } from "../../lib/confirm";
import { Card, Fab, ScreenTitle, SectionLabel } from "../../components/ui";
import { colors, spacing } from "../../lib/theme";

export default function DebtsScreen() {
  const router = useRouter();
  const { data: debts, isLoading, isError, refetch } = useDebts();
  const { refreshing, onRefresh } = usePullRefresh();
  const del = useDeleteDebt();

  const totals = useMemo(() => {
    let ars = 0;
    let usd = 0;
    for (const d of debts ?? []) {
      if (d.currency === "ARS") ars += d.remaining_amount;
      else usd += d.remaining_amount;
    }
    return { ars, usd };
  }, [debts]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={debts ?? []}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <DebtItem
            debt={item}
            onPress={() => router.push({ pathname: "/modals/add-debt", params: { id: item.id } })}
            onLongPress={() => confirmDelete(item.name, () => del.mutate(item.id))}
            onRegisterPayment={() =>
              router.push({
                pathname: "/modals/quick-amount",
                params: { kind: "payment", id: item.id, name: item.name, currency: item.currency },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenTitle>Deudas</ScreenTitle>
            <CurrencyToggle />

            <Card style={styles.summaryCard}>
              <SectionLabel>Total adeudado</SectionLabel>
              <MoneyAmount ars={totals.ars} usd={totals.usd} size="lg" tone="negative" />
            </Card>

            <SectionLabel>Tus deudas</SectionLabel>
          </View>
        }
        ListEmptyComponent={
          isError ? (
            <StateMessage kind="error" message="No pude cargar las deudas." onRetry={() => refetch()} />
          ) : isLoading ? (
            <RowsSkeleton count={3} />
          ) : (
            <StateMessage kind="empty" message="No tenés deudas cargadas. Si tenés tarjeta, préstamo o cuotas, sumalas." />
          )
        }
      />

      <Fab label="Nueva" onPress={() => router.push("/modals/add-debt")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  list: { padding: spacing.xl, paddingBottom: 100, flexGrow: 1 },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  summaryCard: { padding: spacing.xl, gap: spacing.sm },
  separator: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 2 },
});
