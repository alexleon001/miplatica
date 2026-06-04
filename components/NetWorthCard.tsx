// Héroe del dashboard: card de patrimonio neto. Superficie indigo profunda con
// glow + blob de acento para jerarquía visual. Usa MoneyAmount → reacciona al
// CurrencyToggle. Si la query carga o no hay row aún (usuario sin movimientos),
// muestra ceros (la vista v_net_worth no devuelve fila si nada existe).

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFreshNetWorth } from "../lib/hooks/use-net-worth";
import { BrandGradient } from "./BrandGradient";
import { MoneyAmount } from "./MoneyAmount";
import { Skeleton } from "./Skeleton";
import { StateMessage } from "./StateMessage";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function NetWorthCard() {
  const { data, isLoading, isError, refetch } = useFreshNetWorth();

  const netArs = data?.net_ars ?? 0;
  const netUsd = data?.net_usd ?? 0;

  return (
    // El gradiente ES la card (sin overflow:hidden ni blobs → mucho más liviano al
    // scrollear; antes forzaba render offscreen cada frame en Android).
    <BrandGradient style={styles.card}>
      <View style={styles.labelRow}>
        <Ionicons name="sparkles" size={13} color={colors.primaryBright} />
        <Text style={styles.label}>Patrimonio neto</Text>
      </View>

      {isError ? (
        <StateMessage kind="error" message="No pude cargar el patrimonio." onRetry={() => refetch()} />
      ) : isLoading ? (
        <View style={styles.loadingWrap}>
          <Skeleton width={220} height={42} />
          <Skeleton width={150} height={18} />
        </View>
      ) : (
        <MoneyAmount ars={netArs} usd={netUsd} size="xl" />
      )}

      {data ? (
        <View style={styles.breakdown}>
          <Row icon="wallet-outline" tint={colors.ars} label="Activos en cuentas" ars={data.accounts_ars} usd={data.accounts_usd} />
          <Row icon="trending-up-outline" tint={colors.usd} label="Inversiones" ars={data.investments_ars} usd={data.investments_usd} />
          <Row icon="card-outline" tint={colors.negative} label="Deudas" ars={data.debts_ars} usd={data.debts_usd} negative />
        </View>
      ) : null}
    </BrandGradient>
  );
}

function Row({
  icon,
  tint,
  label,
  ars,
  usd,
  negative,
}: {
  icon: IoniconName;
  tint: string;
  label: string;
  ars: number | null;
  usd: number | null;
  negative?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconChip, { backgroundColor: tint + "22" }]}>
          <Ionicons name={icon} size={14} color={tint} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <MoneyAmount ars={ars} usd={usd} size="sm" tone={negative ? "negative" : "default"} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBright + "33",
    ...shadow.glow,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  label: { ...typography.overline, color: colors.primaryBright },
  loadingWrap: { gap: spacing.sm, marginVertical: 2 },
  breakdown: {
    marginTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: spacing.lg,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...typography.caption, color: colors.textSecondary },
});
