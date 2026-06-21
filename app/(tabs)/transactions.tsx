import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
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
import { type Transaction, useCategorizeBatch, useDeleteTransaction, useTransactions } from "../../lib/hooks/use-transactions";
import { usePro } from "../../lib/hooks/use-pro";
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

// Sentinel para el chip "Sin categoría" del filtro por categoría (F1): no es un
// id real de categoría, así que lo distinguimos del null = "todas".
const NO_CATEGORY = "__none__";

// Agrupa por día para las secciones (V1). Trabajamos con el string YYYY-MM-DD
// crudo (no `new Date()`) para evitar el corrimiento de zona horaria: en AR
// (UTC-3) `new Date("2026-06-09")` cae el día anterior 21:00.
const sectionDateFmt = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });
const sectionDateYearFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sectionTitle(key: string, now: Date): string {
  if (key === ymd(now)) return "Hoy";
  if (key === ymd(new Date(now.getTime() - 86_400_000))) return "Ayer";
  // Local midnight para formatear sin corrimiento de zona.
  const d = new Date(`${key}T00:00:00`);
  const fmt = d.getFullYear() === now.getFullYear() ? sectionDateFmt : sectionDateYearFmt;
  return fmt.format(d).replace(".", "");
}

// Etiqueta de un chip de categoría (con ícono); NO_CATEGORY = "sin categoría".
function catChipLabel(id: string): string {
  if (id === NO_CATEGORY) return "📦 Sin categoría";
  const cat = categoryById(id);
  return `${cat?.icon ?? "📦"} ${cat?.label ?? id}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [catFilter, setCatFilter] = useState<string | null>(null); // null = todas
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { data: txs, isLoading, isError, refetch } = useTransactions();
  const monthly = useMonthlyBalance();
  const { refreshing, onRefresh } = usePullRefresh();
  const del = useDeleteTransaction();
  const categorize = useCategorizeBatch();
  const { isPro } = usePro();

  const filtered = useMemo(() => {
    if (!txs) return [];
    const q = query.trim().toLowerCase();
    return txs.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (catFilter === NO_CATEGORY) {
        if (t.category) return false;
      } else if (catFilter && t.category !== catFilter) {
        return false;
      }
      if (!q) return true;
      const catLabel = categoryById(t.category)?.label ?? "";
      const haystack = `${t.merchant ?? ""} ${t.description ?? ""} ${catLabel}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [txs, filter, catFilter, query]);

  // Secciones por día (V1). `filtered` ya viene ordenado por fecha desc (la query
  // ordena por date, created_at), así que las secciones quedan en orden.
  const sections = useMemo(() => {
    const now = new Date();
    const groups: { key: string; title: string; data: Transaction[] }[] = [];
    let current: { key: string; title: string; data: Transaction[] } | null = null;
    for (const t of filtered) {
      const key = t.date.slice(0, 10);
      if (!current || current.key !== key) {
        current = { key, title: sectionTitle(key, now), data: [] };
        groups.push(current);
      }
      current.data.push(t);
    }
    return groups;
  }, [filtered]);

  // Categorías presentes en los datos (para los chips de filtro), ordenadas por
  // frecuencia. Incluye el sentinel "sin categoría" si hay movimientos sin clasificar.
  const presentCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of txs ?? []) {
      const key = t.category ?? NO_CATEGORY;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [txs]);

  const uncategorized = useMemo(() => (txs ?? []).filter((t) => !t.category).length, [txs]);
  const typeLabel = FILTERS.find((f) => f.value === filter)?.label ?? "Todos";
  const activeFilterCount = (filter !== "all" ? 1 : 0) + (catFilter ? 1 : 0);

  function runCategorize() {
    if (categorize.isPending) return;
    // La categorización con IA es Pro: si no es Pro, lo mandamos al paywall.
    if (!isPro) {
      router.push("/paywall");
      return;
    }
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

        {/* Filtros plegables: por defecto solo el botón "Filtrar" + los filtros
            activos (si los hay), para que la lista quede lo más arriba posible. */}
        <View style={styles.filterBar}>
          <Pressable
            style={({ pressed }) => [styles.filterBtn, (showFilters || activeFilterCount > 0) && styles.filterBtnOn, pressed && { opacity: 0.8 }]}
            onPress={() => setShowFilters((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Mostrar filtros"
          >
            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? colors.primaryBright : colors.textMuted} />
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: colors.primaryBright }]}>Filtrar</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
            <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
          </Pressable>

          {!showFilters && filter !== "all" ? (
            <ActiveChip label={typeLabel} onClear={() => setFilter("all")} />
          ) : null}
          {!showFilters && catFilter ? (
            <ActiveChip label={catChipLabel(catFilter)} onClear={() => setCatFilter(null)} />
          ) : null}
        </View>

        {showFilters ? (
          <>
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.value}
                  style={[styles.chip, filter === f.value && styles.chipActive]}
                  onPress={() => setFilter(f.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f.value }}
                >
                  <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {presentCategories.length >= 2 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
                keyboardShouldPersistTaps="handled"
              >
                <CatChip
                  label="Todas"
                  active={catFilter === null}
                  onPress={() => setCatFilter(null)}
                />
                {presentCategories.map((id) => (
                  <CatChip
                    key={id}
                    label={catChipLabel(id)}
                    active={catFilter === id}
                    onPress={() => setCatFilter(catFilter === id ? null : id)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

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
              <Ionicons name={isPro ? "sparkles" : "lock-closed"} size={16} color={colors.primaryBright} />
            )}
            <Text style={styles.aiBannerText}>
              {categorize.isPending
                ? "Categorizando con IA…"
                : `${uncategorized} sin categoría · Categorizar con IA${isPro ? "" : " (Pro)"}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <RecurringBanner />
            <SpendingBreakdown />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
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
          ) : query.trim() || filter !== "all" || catFilter ? (
            <StateMessage kind="empty" message="Ningún movimiento coincide con la búsqueda o el filtro." />
          ) : (
            <StateMessage
              kind="empty"
              message="Todavía no hay movimientos. Agregá el primero."
              actionLabel="Cargar movimiento"
              actionIcon="add"
              onAction={() => router.push("/modals/add-transaction")}
            />
          )
        }
      />

      <Fab label="Nuevo" onPress={() => router.push("/modals/add-transaction")} />
    </SafeAreaView>
  );
}

// Chip compacto del filtro por categoría (fila horizontal scrolleable).
function CatChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.catChip, active && styles.catChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.catChipText, active && styles.catChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Chip de un filtro activo (mostrado cuando el panel está plegado). Tocarlo lo quita.
function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable style={styles.activeChip} onPress={onClear} accessibilityRole="button" accessibilityLabel={`Quitar filtro ${label}`}>
      <Text style={styles.activeChipText} numberOfLines={1}>{label}</Text>
      <Ionicons name="close" size={13} color={colors.primaryBright} />
    </Pressable>
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
  filterBar: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnOn: { borderColor: colors.primary },
  filterBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  filterBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    maxWidth: 200,
  },
  activeChipText: { color: colors.primaryBright, fontSize: 12, fontWeight: "600", flexShrink: 1 },
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
  catRow: { gap: spacing.xs, paddingVertical: 2, paddingRight: spacing.xl },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  catChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  catChipTextActive: { color: colors.primaryBright },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 1 },
  listHeader: { gap: spacing.md, paddingBottom: spacing.md },
  sectionHeader: {
    ...typography.overline,
    color: colors.textMuted,
    backgroundColor: colors.backgroundDark,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  separator: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 2 },
});
