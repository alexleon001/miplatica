import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MoneyAmount } from "../../components/MoneyAmount";
import { RowsSkeleton } from "../../components/Skeleton";
import { StateMessage } from "../../components/StateMessage";
import { TransactionItem } from "../../components/TransactionItem";
import { useMonthlyBalance } from "../../lib/hooks/use-monthly-balance";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { useDeleteTransaction, useTransactions } from "../../lib/hooks/use-transactions";
import { confirmDelete } from "../../lib/confirm";
import { colors } from "../../lib/colors";

type Filter = "all" | "income" | "expense";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",     label: "Todos" },
  { value: "income",  label: "Ingresos" },
  { value: "expense", label: "Gastos" },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const { data: txs, isLoading, isError, refetch } = useTransactions();
  const monthly = useMonthlyBalance();
  const { refreshing, onRefresh } = usePullRefresh();
  const del = useDeleteTransaction();

  const filtered = useMemo(() => {
    if (!txs) return [];
    if (filter === "all") return txs;
    return txs.filter((t) => t.type === filter);
  }, [txs, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Movimientos</Text>

        <View style={styles.summary}>
          <SummaryItem label="Ingresos"  amount={monthly.data?.income_ars}  tone="positive" />
          <SummaryItem label="Gastos"    amount={monthly.data?.expense_ars} tone="negative" />
          <SummaryItem label="Balance"   amount={monthly.data?.balance_ars} tone="default" />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.value}
              style={[styles.chip, filter === f.value && styles.chipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TransactionItem
            tx={item}
            onPress={() => router.push(`/modals/add-transaction?id=${item.id}`)}
            onLongPress={() =>
              confirmDelete(item.merchant ?? item.description ?? "este movimiento", () => del.mutate(item.id))
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          isError ? (
            <StateMessage kind="error" message="No pude cargar los movimientos." onRetry={() => refetch()} />
          ) : isLoading ? (
            <RowsSkeleton count={6} />
          ) : (
            <StateMessage kind="empty" message="Todavía no hay movimientos. Agregá el primero." />
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nuevo movimiento"
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/modals/add-transaction")}
      >
        <Text style={styles.fabText}>+ Nuevo</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SummaryItem({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number | null | undefined;
  tone: "default" | "positive" | "negative";
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <MoneyAmount ars={amount ?? 0} usd={null} size="sm" tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  header: { padding: 20, gap: 14 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  summary: {
    flexDirection: "row",
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  summaryItem: { flex: 1, gap: 4 },
  summaryLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  filters: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.textPrimary },
  list: { paddingHorizontal: 20, paddingBottom: 100, flexGrow: 1 },
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
