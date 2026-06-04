import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MoneyAmount } from "../../components/MoneyAmount";
import { RecurringBanner } from "../../components/RecurringBanner";
import { RowsSkeleton } from "../../components/Skeleton";
import { SpendingBreakdown } from "../../components/SpendingBreakdown";
import { StateMessage } from "../../components/StateMessage";
import { TransactionItem } from "../../components/TransactionItem";
import { useMonthlyBalance } from "../../lib/hooks/use-monthly-balance";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { useCategorizeBatch, useDeleteTransaction, useTransactions } from "../../lib/hooks/use-transactions";
import { categoryById } from "../../lib/categories";
import { confirmDelete } from "../../lib/confirm";
import { Card, Fab, ScreenTitle } from "../../components/ui";
import { colors, radius, spacing, typography } from "../../lib/theme";

type Filter = "all" | "income" | "expense";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",     label: "Todos" },
  { value: "income",  label: "Ingresos" },
  { value: "expense", label: "Gastos" },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const { data: txs, isLoading, isError, refetch } = useTransactions();
  const monthly = useMonthlyBalance();
  const { refreshing, onRefresh } = usePullRefresh();
  const del = useDeleteTransaction();
  const categorize = useCategorizeBatch();

  const filtered = useMemo(() => {
    if (!txs) return [];
    const q = query.trim().toLowerCase();
    return txs.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!q) return true;
      const catLabel = categoryById(t.category)?.label ?? "";
      const haystack = `${t.merchant ?? ""} ${t.description ?? ""} ${catLabel}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [txs, filter, query]);

  const uncategorized = useMemo(() => (txs ?? []).filter((t) => !t.category).length, [txs]);

  function runCategorize() {
    if (categorize.isPending) return;
    categorize.mutate(undefined, {
      onSuccess: (r) =>
        Alert.alert(
          "Listo",
          `Categoricé ${r.categorized} movimiento${r.categorized === 1 ? "" : "s"} con IA.` +
            (r.remaining > 0 ? ` Quedan ${r.remaining}, tocá de nuevo para seguir.` : ""),
        ),
      onError: (e) =>
        Alert.alert("Ups", e instanceof Error ? e.message : "No pude categorizar ahora."),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ScreenTitle>Movimientos</ScreenTitle>

        <Card style={styles.summary}>
          <SummaryItem label="Ingresos"  amount={monthly.data?.income_ars}  tone="positive" />
          <View style={styles.summaryDivider} />
          <SummaryItem label="Gastos"    amount={monthly.data?.expense_ars} tone="negative" />
          <View style={styles.summaryDivider} />
          <SummaryItem label="Balance"   amount={monthly.data?.balance_ars} tone="default" />
        </Card>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar comercio, descripción o categoría…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
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

        {uncategorized > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.aiBanner, (pressed || categorize.isPending) && { opacity: 0.7 }]}
            onPress={runCategorize}
            disabled={categorize.isPending}
            accessibilityLabel="Categorizar movimientos con IA"
          >
            {categorize.isPending ? (
              <ActivityIndicator color={colors.primaryBright} size="small" />
            ) : (
              <Ionicons name="sparkles" size={16} color={colors.primaryBright} />
            )}
            <Text style={styles.aiBannerText}>
              {categorize.isPending
                ? "Categorizando con IA…"
                : `${uncategorized} sin categoría · Categorizar con IA`}
            </Text>
          </Pressable>
        ) : null}

        <RecurringBanner />
        <SpendingBreakdown />
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
          ) : query.trim() || filter !== "all" ? (
            <StateMessage kind="empty" message="Ningún movimiento coincide con la búsqueda o el filtro." />
          ) : (
            <StateMessage kind="empty" message="Todavía no hay movimientos. Agregá el primero." />
          )
        }
      />

      <Fab label="Nuevo" onPress={() => router.push("/modals/add-transaction")} />
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
  header: { padding: spacing.xl, gap: spacing.md },
  summary: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, gap: spacing.xs },
  summaryDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.borderSoft, marginHorizontal: spacing.sm },
  summaryLabel: { ...typography.overline, color: colors.textMuted },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14, padding: 0 },
  filters: { flexDirection: "row", gap: spacing.xs },
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + "55",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  aiBannerText: { color: colors.primaryBright, fontSize: 13, fontWeight: "700" },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100, flexGrow: 1 },
  separator: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 2 },
});
