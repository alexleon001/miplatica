// Proyección de pagos (cash-flow mensual) — el "Excel" mejorado.
// Tira horizontal de meses (overview con el neto) + detalle del mes elegido:
// ítems agrupados por medio de pago, subtotales, TOTAL e ingreso editable, y el
// neto Deuda/Ganancia. La grilla la arma lib/projection.ts (testeada).

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { CurrencyToggle } from "../components/CurrencyToggle";
import { MoneyAmount } from "../components/MoneyAmount";
import { StateMessage } from "../components/StateMessage";
import { useDebts } from "../lib/hooks/use-debts";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useProfile } from "../lib/hooks/use-profile";
import {
  useClearProjectionIncome,
  useDeleteProjectionItem,
  useProjectionIncome,
  useProjectionItems,
} from "../lib/hooks/use-projection";
import { confirmDelete } from "../lib/confirm";
import {
  buildProjection,
  debtToProjItem,
  monthKey,
  monthLabel,
  monthsWindow,
  type ProjItem,
} from "../lib/projection";
import { colors } from "../lib/colors";

const HORIZONS = [6, 12] as const;

export default function ProjectionScreen() {
  const router = useRouter();
  const { data: items, isLoading, isError, refetch } = useProjectionItems();
  const { data: debts } = useDebts();
  const { data: incomeOverrides } = useProjectionIncome();
  const { data: profile } = useProfile();
  const { data: rates } = useExchangeRates();
  const delItem = useDeleteProjectionItem();
  const clearIncome = useClearProjectionIncome();

  const [horizon, setHorizon] = useState<number>(12);
  const [selected, setSelected] = useState<string>(monthKey(new Date()));

  const mep = rates?.mep ?? null;
  const defaultIncome = profile?.monthly_income_ars ?? 0;

  const projection = useMemo(() => {
    const start = monthKey(new Date());
    const window = monthsWindow(start, horizon);
    const today = start;

    const projItems: ProjItem[] = (items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      paymentMethod: i.payment_method,
      amount: Number(i.amount),
      currency: i.currency === "USD" ? "USD" : "ARS",
      recurrence: i.recurrence as ProjItem["recurrence"],
      startMonth: monthKey(i.start_month),
      installmentsTotal: i.installments_total,
    }));

    const debtItems = (debts ?? [])
      .map((d) => debtToProjItem(d, today))
      .filter((x): x is ProjItem => x != null);

    return buildProjection({
      items: [...projItems, ...debtItems],
      window,
      defaultIncomeArs: defaultIncome,
      incomeOverrides: incomeOverrides ?? {},
      mep,
    });
  }, [items, debts, incomeOverrides, defaultIncome, mep, horizon]);

  const current =
    projection.months.find((m) => m.month === selected) ?? projection.months[0];

  const hasData = (items?.length ?? 0) > 0 || (debts?.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Proyección", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ Volver</Text>
          </Pressable>
          <CurrencyToggle />
        </View>
        <Text style={styles.title}>Proyección de pagos</Text>
        <Text style={styles.subtitle}>Tu flujo de caja mes a mes. Rojo = gastás más de lo que entra.</Text>

        <View style={styles.horizonRow}>
          {HORIZONS.map((h) => (
            <Pressable
              key={h}
              style={[styles.horizonChip, horizon === h && styles.horizonChipActive]}
              onPress={() => setHorizon(h)}
            >
              <Text style={[styles.horizonText, horizon === h && styles.horizonTextActive]}>{h} meses</Text>
            </Pressable>
          ))}
        </View>

        {!hasData && !isLoading ? (
          isError ? (
            <StateMessage kind="error" message="No pude cargar la proyección." onRetry={() => refetch()} />
          ) : (
            <StateMessage
              kind="empty"
              message="Cargá tus gastos fijos, cuotas y servicios para ver la proyección. Las deudas que ya tengas aparecen solas."
            />
          )
        ) : (
          <>
            {/* Overview horizontal: una tarjeta por mes con el neto. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overview}>
              {projection.months.map((m) => {
                const isSel = m.month === selected;
                const deficit = m.netArs < 0;
                return (
                  <Pressable
                    key={m.month}
                    onPress={() => setSelected(m.month)}
                    style={[
                      styles.monthCard,
                      isSel && styles.monthCardActive,
                      { borderLeftColor: deficit ? colors.negative : colors.positive },
                    ]}
                  >
                    <Text style={styles.monthCardLabel}>{monthLabel(m.month, false)}</Text>
                    <Text style={styles.monthCardYear}>{m.month.slice(0, 4)}</Text>
                    <Text style={[styles.monthCardNet, { color: deficit ? colors.negative : colors.positive }]}>
                      {deficit ? "" : "+"}
                      {Math.round(m.netArs).toLocaleString("es-AR")}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {current && (
              <View style={styles.detail}>
                <Text style={styles.detailMonth}>{monthLabel(current.month)}</Text>

                {/* Ingreso (editable) */}
                <Pressable
                  style={styles.incomeRow}
                  onPress={() => router.push(`/modals/set-income?month=${current.month}`)}
                  onLongPress={() => {
                    if (incomeOverrides?.[current.month] != null) {
                      confirmDelete("el ajuste de ingreso de este mes", () => clearIncome.mutate(current.month));
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incomeLabel}>
                      Sueldo neto{incomeOverrides?.[current.month] != null ? " · ajustado ✎" : " ✎"}
                    </Text>
                  </View>
                  <MoneyAmount ars={current.incomeArs} usd={current.incomeUsd} size="sm" tone="positive" />
                </Pressable>

                {/* Grupos por medio de pago */}
                {current.groups.map((g) => (
                  <View key={g.paymentMethod} style={styles.group}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupName}>{g.paymentMethod}</Text>
                      <Text style={styles.groupSubtotal}>
                        {Math.round(g.subtotalArs).toLocaleString("es-AR")}
                      </Text>
                    </View>
                    {g.lines.map((l) => {
                      const isDebt = l.id.startsWith("debt:");
                      return (
                        <Pressable
                          key={l.id}
                          style={styles.line}
                          disabled={isDebt}
                          onPress={() => router.push(`/modals/add-projection-item?id=${l.id}`)}
                          onLongPress={() =>
                            !isDebt && confirmDelete(l.name, () => delItem.mutate(l.id))
                          }
                        >
                          <Text style={styles.lineName} numberOfLines={1}>
                            {l.name}
                            {l.installmentLabel ? <Text style={styles.lineCuota}>  cuota {l.installmentLabel}</Text> : null}
                            {isDebt ? <Text style={styles.lineTag}>  · deuda</Text> : null}
                          </Text>
                          <Text style={styles.lineAmount}>{Math.round(l.amountArs).toLocaleString("es-AR")}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}

                {/* TOTAL + neto */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL egresos</Text>
                  <MoneyAmount ars={current.totalArs} usd={current.totalUsd} size="sm" />
                </View>
                <View style={[styles.netRow, { backgroundColor: (current.netArs < 0 ? colors.negative : colors.positive) + "22" }]}>
                  <Text style={styles.netLabel}>{current.netArs < 0 ? "Déficit del mes" : "Te sobra"}</Text>
                  <MoneyAmount
                    ars={current.netArs}
                    usd={current.netUsd}
                    size="md"
                    tone={current.netArs < 0 ? "negative" : "positive"}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nuevo gasto en la proyección"
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/modals/add-projection-item")}
      >
        <Text style={styles.fabText}>+ Gasto</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, paddingBottom: 100, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13 },
  horizonRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  horizonChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.surfaceDark, borderWidth: 1, borderColor: colors.border,
  },
  horizonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  horizonText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  horizonTextActive: { color: colors.textPrimary },
  overview: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  monthCard: {
    backgroundColor: colors.surfaceDark, borderRadius: 14, padding: 12, minWidth: 110,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, gap: 2,
  },
  monthCardActive: { borderColor: colors.primary },
  monthCardLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  monthCardYear: { color: colors.textMuted, fontSize: 11 },
  monthCardNet: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  detail: {
    backgroundColor: colors.surfaceDark, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 10, marginTop: 4,
  },
  detailMonth: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  incomeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  incomeLabel: { color: colors.positive, fontSize: 13, fontWeight: "600" },
  group: { gap: 4, marginTop: 6 },
  groupHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  groupName: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  groupSubtotal: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  line: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 7,
  },
  lineName: { color: colors.textPrimary, fontSize: 14, flex: 1, marginRight: 8 },
  lineCuota: { color: colors.warning, fontSize: 12 },
  lineTag: { color: colors.textMuted, fontSize: 12 },
  lineAmount: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  netRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderRadius: 12, padding: 12, marginTop: 6,
  },
  netLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  fab: {
    position: "absolute", right: 20, bottom: 20, backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  fabText: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
});
