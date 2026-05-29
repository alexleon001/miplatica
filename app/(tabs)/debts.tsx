import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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
import { colors } from "../../lib/colors";

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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={debts ?? []}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <DebtItem
            debt={item}
            onPress={() => router.push({ pathname: "/modals/add-debt", params: { id: item.id } })}
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
            <Text style={styles.title}>Deudas</Text>
            <CurrencyToggle />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total adeudado</Text>
              <MoneyAmount ars={totals.ars} usd={totals.usd} size="lg" tone="negative" />
            </View>

            <Text style={styles.listLabel}>Tus deudas</Text>
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva deuda"
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/modals/add-debt")}
      >
        <Text style={styles.fabText}>+ Nueva</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  list: { padding: 20, paddingBottom: 100, flexGrow: 1 },
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
