// Patrimonio neto — rediseño "Línea" (versión B): SIN caja. Label PATRIMONIO NETO,
// número grande tabular, y 3 filas (Activos / Inversiones / Deudas) separadas por
// divisores hairline. Acento sólo donde corresponde; Deudas en --neg. useTheme().

import { StyleSheet, Text, View } from "react-native";
import { useFreshNetWorth } from "../lib/hooks/use-net-worth";
import { useTheme } from "../lib/theme-context";
import { MoneyAmount } from "./MoneyAmount";
import { Skeleton } from "./Skeleton";
import { StateMessage } from "./StateMessage";

export function NetWorthCard() {
  const c = useTheme();
  const { data, isLoading, isError, refetch } = useFreshNetWorth();

  const netArs = data?.net_ars ?? 0;
  const netUsd = data?.net_usd ?? 0;

  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.label, { color: c.textDim }]}>Patrimonio neto</Text>

      {isError ? (
        <StateMessage kind="error" message="No pude cargar el patrimonio." onRetry={() => refetch()} />
      ) : isLoading ? (
        <View style={{ gap: 8 }}>
          <Skeleton width={220} height={40} />
          <Skeleton width={150} height={16} />
        </View>
      ) : (
        <MoneyAmount ars={netArs} usd={netUsd} size="lg" />
      )}

      {data ? (
        <View style={{ marginTop: 6 }}>
          <Row label="Activos en cuentas" ars={data.accounts_ars} usd={data.accounts_usd} border={c.border} dim={c.textDim} />
          <Row label="Inversiones" ars={data.investments_ars} usd={data.investments_usd} border={c.border} dim={c.textDim} />
          <Row label="Deudas" ars={data.debts_ars} usd={data.debts_usd} border={c.border} dim={c.textDim} negative />
        </View>
      ) : null}
    </View>
  );
}

function Row({
  label,
  ars,
  usd,
  border,
  dim,
  negative,
}: {
  label: string;
  ars: number | null;
  usd: number | null;
  border: string;
  dim: string;
  negative?: boolean;
}) {
  return (
    <View style={[styles.row, { borderTopColor: border }]}>
      <Text style={[styles.rowLabel, { color: dim }]}>{label}</Text>
      <MoneyAmount ars={ars} usd={usd} size="sm" tone={negative ? "negative" : "default"} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  rowLabel: { fontSize: 14 },
});
