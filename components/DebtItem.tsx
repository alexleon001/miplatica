import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Debt } from "../lib/hooks/use-debts";
import { MoneyAmount } from "./MoneyAmount";
import { colors } from "../lib/colors";

const TYPE_META: Record<string, { label: string; icon: string }> = {
  credit_card: { label: "Tarjeta", icon: "💳" },
  loan: { label: "Préstamo", icon: "🏦" },
  informal: { label: "Informal", icon: "🤝" },
  cuotas: { label: "Cuotas", icon: "🧾" },
};

const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

export function DebtItem({
  debt,
  onPress,
  onLongPress,
}: {
  debt: Debt;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const meta = TYPE_META[debt.type] ?? { label: debt.type, icon: "💸" };

  const sub = [
    meta.label,
    debt.next_payment_date ? `vence ${dayFmt.format(new Date(debt.next_payment_date))}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const remainingArs = debt.currency === "ARS" ? debt.remaining_amount : null;
  const remainingUsd = debt.currency === "USD" ? debt.remaining_amount : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && (onPress || onLongPress) ? { opacity: 0.6 } : null]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{meta.icon}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {debt.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>

      <MoneyAmount ars={remainingArs} usd={remainingUsd} size="sm" tone="negative" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.negative + "22",
  },
  iconText: { fontSize: 20 },
  middle: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontWeight: "600", fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 12 },
});
