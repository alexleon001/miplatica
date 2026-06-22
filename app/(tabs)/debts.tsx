import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
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
import { Fab } from "../../components/ui";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { spacing } from "../../lib/theme";

export default function DebtsScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Deudas</Text>
            <CurrencyToggle />

            <View style={styles.summary}>
              <Text style={styles.label}>Total adeudado</Text>
              <MoneyAmount ars={totals.ars} usd={totals.usd} size="lg" tone="negative" />
            </View>

            <Text style={styles.label}>Tus deudas</Text>
          </View>
        }
        ListEmptyComponent={
          isError ? (
            <StateMessage kind="error" message="No pude cargar las deudas." onRetry={() => refetch()} />
          ) : isLoading ? (
            <RowsSkeleton count={3} />
          ) : (
            <StateMessage
              kind="empty"
              message="No tenés deudas cargadas. Si tenés tarjeta, préstamo o cuotas, sumalas."
              actionLabel="Sumar deuda"
              actionIcon="add"
              onAction={() => router.push("/modals/add-debt")}
            />
          )
        }
      />

      <Fab label="Nueva" onPress={() => router.push("/modals/add-debt")} />
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    list: { padding: spacing.xl, paddingBottom: 100, flexGrow: 1 },
    header: { gap: spacing.lg, marginBottom: spacing.sm },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    label: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase", color: c.textDim },
    summary: { gap: spacing.sm },
    separator: { height: 1, backgroundColor: c.border, marginVertical: 2 },
  });
}
