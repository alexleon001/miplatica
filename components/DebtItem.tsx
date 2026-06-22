import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Debt } from "../lib/hooks/use-debts";
import { useTheme } from "../lib/theme-context";
import { withAlpha } from "../lib/theme-tokens";
import { MoneyAmount } from "./MoneyAmount";

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
  onRegisterPayment,
}: {
  debt: Debt;
  onPress?: () => void;
  onLongPress?: () => void;
  onRegisterPayment?: () => void;
}) {
  const c = useTheme();
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
      <View style={[styles.icon, { backgroundColor: withAlpha(c.neg, 0.15), borderColor: c.border }]}>
        <Text style={styles.iconText}>{meta.icon}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {debt.name}
        </Text>
        <Text style={[styles.sub, { color: c.textDim }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>

      <View style={styles.right}>
        <MoneyAmount ars={remainingArs} usd={remainingUsd} size="sm" tone="negative" />
        {onRegisterPayment && debt.remaining_amount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Registrar pago de ${debt.name}`}
            onPress={onRegisterPayment}
            hitSlop={6}
            style={({ pressed }) => [styles.payPill, { borderColor: c.accent }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.payPillText, { color: c.accent }]}>Pagar</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
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
  right: { alignItems: "flex-end", gap: 6 },
  payPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  payPillText: { fontSize: 12, fontWeight: "700" },
});
