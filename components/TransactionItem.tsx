import { Pressable, StyleSheet, Text, View } from "react-native";
import { categoryById } from "../lib/categories";
import type { Transaction } from "../lib/hooks/use-transactions";
import { MoneyAmount } from "./MoneyAmount";
import { colors } from "../lib/colors";

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
      <View style={[styles.icon, { backgroundColor: (cat?.color ?? colors.border) + "33" }]}>
        <Text style={styles.iconText}>{cat?.icon ?? "📦"}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.merchant ?? tx.description ?? cat?.label ?? "Sin descripción"}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  middle: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontWeight: "600", fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 12 },
});
