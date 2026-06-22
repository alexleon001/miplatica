// Fila de movimiento — rediseño "Línea": caja de ícono con borde fino + título/
// subtítulo + monto. Sin caja de fondo; la separación la dan los hairlines de la
// lista. useTheme() para reaccionar al tema en vivo.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { categoryById } from "../lib/categories";
import type { Transaction } from "../lib/hooks/use-transactions";
import { useTheme } from "../lib/theme-context";
import { withAlpha } from "../lib/theme-tokens";
import { MoneyAmount } from "./MoneyAmount";

const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

export function TransactionItem({
  tx,
  onPress,
  onLongPress,
}: {
  tx: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const c = useTheme();
  const cat = categoryById(tx.category);
  const isIncome = tx.type === "income";
  const tone = isIncome ? "positive" : tx.type === "expense" ? "negative" : "default";

  // Una transacción puede tener solo ARS o tener ambas amounts (post-conversión).
  const signedArs = isIncome ? tx.amount_ars : -tx.amount_ars;
  const signedUsd = tx.amount_usd != null ? (isIncome ? tx.amount_usd : -tx.amount_usd) : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && (onPress || onLongPress) ? { opacity: 0.6 } : null]}
    >
      <View style={[styles.icon, { backgroundColor: withAlpha(cat?.color ?? c.textFaint, 0.18), borderColor: c.border }]}>
        <Text style={styles.iconText}>{cat?.icon ?? "📦"}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {tx.merchant ?? tx.description ?? cat?.label ?? "Sin descripción"}
        </Text>
        <Text style={[styles.sub, { color: c.textDim }]} numberOfLines={1}>
          {cat?.label ?? "Sin categoría"} · {dayFmt.format(new Date(tx.date))}
        </Text>
      </View>

      <MoneyAmount ars={signedArs} usd={signedUsd} size="sm" tone={tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  middle: { flex: 1, gap: 2 },
  title: { fontWeight: "600", fontSize: 15 },
  sub: { fontSize: 12 },
});
