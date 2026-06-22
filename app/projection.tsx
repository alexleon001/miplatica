// Proyección de pagos (cash-flow mensual) — el "Excel" mejorado.
// Tira horizontal de meses (overview con el neto) + detalle del mes elegido:
// ítems agrupados por medio de pago, subtotales, TOTAL e ingreso editable, y el
// neto Deuda/Ganancia. La grilla la arma lib/projection.ts (testeada).

import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CurrencyToggle } from "../components/CurrencyToggle";
import { MoneyAmount } from "../components/MoneyAmount";
import { StateMessage } from "../components/StateMessage";
import { Fab } from "../components/ui";
import { useDebts } from "../lib/hooks/use-debts";
import { useExchangeRates } from "../lib/hooks/use-exchange-rates";
import { useNetWorth } from "../lib/hooks/use-net-worth";
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
  projectionToText,
  type ProjItem,
} from "../lib/projection";
import { paidKey, useProjectionPaidStore } from "../lib/store/projection-paid";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

const HORIZONS = [6, 12] as const;

export default function ProjectionScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: items, isLoading, isError, refetch } = useProjectionItems();
  const { data: debts } = useDebts();
  const { data: incomeOverrides } = useProjectionIncome();
  const { data: profile } = useProfile();
  const { data: rates } = useExchangeRates();
  const { data: netWorth } = useNetWorth();
  const delItem = useDeleteProjectionItem();
  const clearIncome = useClearProjectionIncome();
  const paidMap = useProjectionPaidStore((s) => s.paid);
  const togglePaid = useProjectionPaidStore((s) => s.toggle);

  const [horizon, setHorizon] = useState<number>(12);
  const [selected, setSelected] = useState<string>(monthKey(new Date()));

  const mep = rates?.mep ?? null;
  const defaultIncome = profile?.monthly_income_ars ?? 0;
  // Efectivo de hoy = saldo de cuentas (líquido). Siembra el saldo proyectado.
  const startingBalanceArs = netWorth?.accounts_ars ?? 0;
  const startingBalanceUsd = netWorth?.accounts_usd ?? null;

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
      startingBalanceArs,
      // El mes en curso es informativo (tu efectivo de hoy ya refleja lo cobrado/
      // pagado de este mes); el saldo proyectado acumula desde el mes que viene.
      accrueFirstMonth: false,
    });
  }, [items, debts, incomeOverrides, defaultIncome, mep, horizon, startingBalanceArs]);

  const lastMonth = projection.months[projection.months.length - 1];
  const currentMonthKey = monthKey(new Date());

  const current =
    projection.months.find((m) => m.month === selected) ?? projection.months[0];

  const hasData = (items?.length ?? 0) > 0 || (debts?.length ?? 0) > 0;

  // Restante por pagar del mes seleccionado = egresos cuyas líneas NO marcaste
  // como pagadas. El TOTAL sigue siendo el completo (no se toca la lógica pura).
  const remaining = useMemo(() => {
    if (!current) return { ars: 0, usd: null as number | null };
    let ars = 0;
    let usd: number | null = 0;
    for (const g of current.groups) {
      for (const l of g.lines) {
        if (paidMap[paidKey(l.id, current.month)]) continue;
        ars += l.amountArs;
        if (usd != null && l.amountUsd != null) usd += l.amountUsd;
        else usd = null;
      }
    }
    return { ars, usd };
  }, [current, paidMap]);

  async function shareProjection() {
    try {
      await Share.share({ message: projectionToText(projection) });
    } catch {
      // usuario canceló o no hay share sheet — sin ruido.
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: "Proyección", headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={c.accent} />
          </Pressable>
          <View style={styles.headerActions}>
            {hasData ? (
              <Pressable onPress={shareProjection} hitSlop={12} accessibilityLabel="Compartir proyección" style={styles.shareBtn}>
                <Ionicons name="share-outline" size={20} color={c.accent} />
              </Pressable>
            ) : null}
            <CurrencyToggle />
          </View>
        </View>
        <Text style={styles.title}>Proyección de pagos</Text>
        <Text style={styles.subtitle}>
          Tu flujo de caja mes a mes. El número grande de cada mes es tu saldo proyectado; rojo = te quedás sin efectivo.
        </Text>

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
            {/* Resumen de cash-flow: efectivo hoy → saldo proyectado al final +
                aviso de en qué mes te quedás corto. */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Efectivo hoy</Text>
                  <MoneyAmount ars={startingBalanceArs} usd={startingBalanceUsd} size="sm" />
                </View>
                <Ionicons name="arrow-forward" size={16} color={c.textDim} />
                <View style={[styles.summaryItem, { alignItems: "flex-end" }]}>
                  <Text style={styles.summaryLabel}>Saldo en {horizon} meses</Text>
                  <MoneyAmount
                    ars={lastMonth?.cumulativeArs ?? startingBalanceArs}
                    usd={lastMonth?.cumulativeUsd ?? startingBalanceUsd}
                    size="sm"
                    tone={(lastMonth?.cumulativeArs ?? 0) < 0 ? "negative" : "positive"}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: withAlpha(projection.firstDeficitMonth ? c.neg : c.pos, 0.12) },
                ]}
              >
                <Ionicons
                  name={projection.firstDeficitMonth ? "alert-circle" : "checkmark-circle"}
                  size={16}
                  color={projection.firstDeficitMonth ? c.neg : c.pos}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: projection.firstDeficitMonth ? c.neg : c.pos },
                  ]}
                >
                  {projection.firstDeficitMonth
                    ? `Ojo: te quedás sin efectivo en ${monthLabel(projection.firstDeficitMonth)}.`
                    : `Tu saldo se mantiene en positivo los ${horizon} meses.`}
                </Text>
              </View>
            </View>

            {/* Overview horizontal: una tarjeta por mes con el saldo proyectado. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overview}>
              {projection.months.map((m) => {
                const isSel = m.month === selected;
                const isCurrent = m.month === currentMonthKey;
                const underwater = m.cumulativeArs < 0;
                const net = Math.round(m.netArs);
                return (
                  <Pressable
                    key={m.month}
                    onPress={() => setSelected(m.month)}
                    style={[
                      styles.monthCard,
                      isSel && styles.monthCardActive,
                      { borderLeftColor: underwater ? c.neg : c.pos },
                    ]}
                  >
                    <View style={styles.monthCardHead}>
                      <Text style={styles.monthCardLabel}>{monthLabel(m.month, false)}</Text>
                      {isCurrent ? <Text style={styles.monthCardToday}>hoy</Text> : null}
                    </View>
                    <Text style={styles.monthCardYear}>{m.month.slice(0, 4)}</Text>
                    <Text style={[styles.monthCardNet, { color: underwater ? c.neg : c.pos }]}>
                      {Math.round(m.cumulativeArs).toLocaleString("es-AR")}
                    </Text>
                    {isCurrent ? (
                      <Text style={styles.monthCardSub}>efectivo hoy</Text>
                    ) : (
                      <Text style={[styles.monthCardSub, { color: net < 0 ? c.neg : c.textDim }]}>
                        {net >= 0 ? "+" : ""}
                        {net.toLocaleString("es-AR")} este mes
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {current && (
              <View style={styles.detail}>
                <Text style={styles.detailMonth}>{monthLabel(current.month)}</Text>
                <Text style={styles.detailHint}>Usá los botones ✎ para editar y 🗑 para borrar cada gasto. Las deudas se editan en Deudas.</Text>

                {/* Ingreso (editable) */}
                <View style={styles.incomeRow}>
                  <Pressable
                    style={styles.incomeMain}
                    onPress={() => router.push(`/modals/set-income?month=${current.month}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.incomeLabel}>
                        Sueldo neto{incomeOverrides?.[current.month] != null ? " · ajustado ✎" : " ✎"}
                      </Text>
                    </View>
                    <MoneyAmount ars={current.incomeArs} usd={current.incomeUsd} size="sm" tone="positive" />
                  </Pressable>
                  {incomeOverrides?.[current.month] != null ? (
                    <Pressable
                      onPress={() =>
                        confirmDelete("el ajuste de ingreso de este mes", () => clearIncome.mutate(current.month))
                      }
                      hitSlop={8}
                      style={styles.lineBtn}
                      accessibilityLabel="Quitar ajuste de ingreso"
                    >
                      <Ionicons name="trash-outline" size={16} color={c.neg} />
                    </Pressable>
                  ) : null}
                </View>

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
                      const editItem = () => router.push(`/modals/add-projection-item?id=${l.id}`);
                      const pkey = paidKey(l.id, current.month);
                      const paid = !!paidMap[pkey];
                      return (
                        <View key={l.id} style={styles.line}>
                          <Pressable
                            onPress={() => togglePaid(pkey)}
                            hitSlop={8}
                            style={styles.checkbox}
                            accessibilityLabel={paid ? `Marcar ${l.name} como pendiente` : `Marcar ${l.name} como pagado`}
                          >
                            <Ionicons
                              name={paid ? "checkmark-circle" : "ellipse-outline"}
                              size={20}
                              color={paid ? c.pos : c.textDim}
                            />
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [styles.lineMain, pressed && !isDebt && styles.linePressed]}
                            disabled={isDebt}
                            onPress={editItem}
                          >
                            <Text style={[styles.lineName, paid && styles.linePaid]} numberOfLines={1}>
                              {l.name}
                              {l.installmentLabel ? <Text style={styles.lineCuota}>  cuota {l.installmentLabel}</Text> : null}
                              {isDebt ? <Text style={styles.lineTag}>  · deuda</Text> : null}
                            </Text>
                            <Text style={[styles.lineAmount, paid && styles.linePaid]}>{Math.round(l.amountArs).toLocaleString("es-AR")}</Text>
                          </Pressable>
                          {isDebt ? (
                            <Text style={styles.lineDebtHint}>en Deudas</Text>
                          ) : (
                            <View style={styles.lineActions}>
                              <Pressable onPress={() => router.push(`/modals/add-projection-item?dup=${l.id}`)} hitSlop={8} style={styles.lineBtn} accessibilityLabel={`Duplicar ${l.name}`}>
                                <Ionicons name="copy-outline" size={16} color={c.textDim} />
                              </Pressable>
                              <Pressable onPress={editItem} hitSlop={8} style={styles.lineBtn} accessibilityLabel={`Editar ${l.name}`}>
                                <Ionicons name="pencil" size={16} color={c.accent} />
                              </Pressable>
                              <Pressable
                                onPress={() => confirmDelete(l.name, () => delItem.mutate(l.id))}
                                hitSlop={8}
                                style={styles.lineBtn}
                                accessibilityLabel={`Borrar ${l.name}`}
                              >
                                <Ionicons name="trash-outline" size={16} color={c.neg} />
                              </Pressable>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}

                {/* TOTAL + neto */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL egresos</Text>
                  <MoneyAmount ars={current.totalArs} usd={current.totalUsd} size="sm" />
                </View>
                {remaining.ars < current.totalArs ? (
                  <View style={styles.remainingRow}>
                    <Text style={styles.remainingLabel}>Te falta pagar</Text>
                    <MoneyAmount ars={remaining.ars} usd={remaining.usd} size="sm" tone="warning" />
                  </View>
                ) : null}
                <View style={[styles.netRow, { backgroundColor: withAlpha(current.netArs < 0 ? c.neg : c.pos, 0.13) }]}>
                  <Text style={styles.netLabel}>{current.netArs < 0 ? "Déficit del mes" : "Te sobra"}</Text>
                  <MoneyAmount
                    ars={current.netArs}
                    usd={current.netUsd}
                    size="md"
                    tone={current.netArs < 0 ? "negative" : "positive"}
                  />
                </View>

                <View style={styles.cumulativeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cumulativeLabel}>
                      {current.month === currentMonthKey ? "Efectivo hoy" : "Saldo proyectado a fin de mes"}
                    </Text>
                    <Text style={styles.cumulativeHint}>
                      {current.month === currentMonthKey
                        ? "Tu saldo de cuentas. La proyección acumula desde el mes que viene."
                        : "Efectivo de hoy + sueldo − gastos, acumulado."}
                    </Text>
                  </View>
                  <MoneyAmount
                    ars={current.cumulativeArs}
                    usd={current.cumulativeUsd}
                    size="sm"
                    tone={current.cumulativeArs < 0 ? "negative" : "positive"}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Fab label="Gasto" bottomInset={insets.bottom} onPress={() => router.push("/modals/add-projection-item")} />
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    shareBtn: {
      width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    subtitle: { fontSize: 13, color: c.textDim },
    horizonRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    horizonChip: {
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    },
    horizonChipActive: { backgroundColor: c.accent, borderColor: c.accent },
    horizonText: { color: c.textDim, fontWeight: "600", fontSize: 13 },
    horizonTextActive: { color: c.accentContrast },
    summary: {
      backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderWidth: 1, borderColor: c.border, gap: spacing.md, marginTop: spacing.xs,
      ...shadow.sm,
    },
    summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    summaryItem: { gap: 2 },
    summaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim },
    statusBanner: {
      flexDirection: "row", alignItems: "center", gap: spacing.sm,
      borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    statusText: { fontSize: 13, fontWeight: "700", flex: 1 },
    overview: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.sm },
    monthCard: {
      backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md, minWidth: 110,
      borderWidth: 1, borderColor: c.border, borderLeftWidth: 4, gap: 2,
      ...shadow.sm,
    },
    monthCardActive: { borderColor: c.accent },
    monthCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
    monthCardLabel: { color: c.text, fontSize: 14, fontWeight: "700" },
    monthCardToday: {
      color: c.accent, fontSize: 9, fontWeight: "800", textTransform: "uppercase",
      letterSpacing: 0.5, backgroundColor: c.accentSoft, paddingHorizontal: 5, paddingVertical: 1,
      borderRadius: radius.sm, overflow: "hidden",
    },
    monthCardYear: { color: c.textDim, fontSize: 11 },
    monthCardNet: { fontSize: 16, fontWeight: "800", marginTop: spacing.xs, fontVariant: ["tabular-nums"] },
    monthCardSub: { fontSize: 11, fontWeight: "600", marginTop: 1, color: c.textDim },
    detail: {
      backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderWidth: 1, borderColor: c.border, gap: spacing.md, marginTop: spacing.xs,
      ...shadow.sm,
    },
    detailMonth: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    detailHint: { fontSize: 13, color: c.textDim, marginTop: -spacing.xs },
    incomeRow: {
      flexDirection: "row", alignItems: "center", gap: spacing.sm,
      paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    incomeMain: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    incomeLabel: { color: c.pos, fontSize: 13, fontWeight: "700" },
    group: { gap: spacing.xs, marginTop: spacing.sm },
    groupHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    groupName: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim },
    groupSubtotal: { color: c.textDim, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
    line: {
      flexDirection: "row", alignItems: "center", gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    checkbox: { width: 24, alignItems: "center", justifyContent: "center" },
    linePaid: { textDecorationLine: "line-through", color: c.textDim },
    lineMain: {
      flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      gap: spacing.sm,
    },
    linePressed: { opacity: 0.55 },
    lineName: { color: c.text, fontSize: 14, flex: 1, marginRight: spacing.sm },
    lineCuota: { color: c.warn, fontSize: 12 },
    lineTag: { color: c.textDim, fontSize: 12 },
    lineAmount: { color: c.text, fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
    lineActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    lineBtn: {
      width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center",
      backgroundColor: c.surface2,
    },
    lineDebtHint: { color: c.textDim, fontSize: 11, fontStyle: "italic" },
    totalRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border,
    },
    totalLabel: { color: c.text, fontSize: 14, fontWeight: "700" },
    remainingRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginTop: spacing.xs,
    },
    remainingLabel: { color: c.warn, fontSize: 13, fontWeight: "700" },
    netRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm,
    },
    netLabel: { color: c.text, fontSize: 14, fontWeight: "700" },
    cumulativeRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border,
    },
    cumulativeLabel: { color: c.text, fontSize: 14, fontWeight: "700" },
    cumulativeHint: { fontSize: 11, color: c.textDim, marginTop: 1 },
  });
}
