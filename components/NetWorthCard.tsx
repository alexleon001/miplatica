// Card grande de patrimonio neto. Usa MoneyAmount → reacciona al CurrencyToggle.
// Si la query está cargando o no hay row aún (usuario sin movimientos), muestra
// ceros (la vista v_net_worth no devuelve fila si nada existe).

import { StyleSheet, Text, View } from "react-native";
import { useNetWorth } from "../lib/hooks/use-net-worth";
import { MoneyAmount } from "./MoneyAmount";
import { StateMessage } from "./StateMessage";
import { colors } from "../lib/colors";

export function NetWorthCard() {
  const { data, isLoading, isError, refetch } = useNetWorth();

  const netArs = data?.net_ars ?? 0;
  const netUsd = data?.net_usd ?? 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Patrimonio neto</Text>
      {isError ? (
        <StateMessage kind="error" message="No pude cargar el patrimonio." onRetry={() => refetch()} />
      ) : isLoading ? (
        <Text style={styles.loading}>Cargando…</Text>
      ) : (
        <MoneyAmount ars={netArs} usd={netUsd} size="lg" />
      )}
      {data ? (
        <View style={styles.breakdown}>
          <Row label="Activos en cuentas" ars={data.accounts_ars} usd={data.accounts_usd} />
          <Row label="Inversiones"         ars={data.investments_ars} usd={data.investments_usd} />
          <Row label="Deudas"              ars={data.debts_ars}      usd={data.debts_usd}      negative />
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, ars, usd, negative }: { label: string; ars: number | null; usd: number | null; negative?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <MoneyAmount ars={ars} usd={usd} size="sm" tone={negative ? "negative" : "default"} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  label: { color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  loading: { color: colors.textMuted, fontSize: 18 },
  breakdown: { marginTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
});
