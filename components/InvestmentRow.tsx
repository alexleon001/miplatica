import { Pressable, StyleSheet, Text, View } from "react-native";
import { instrumentById } from "../lib/instruments";
import type { Investment } from "../lib/hooks/use-investments";
import { MoneyAmount } from "./MoneyAmount";
import { PnLBadge } from "./PnLBadge";
import { colors } from "../lib/colors";

const qtyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });

export function InvestmentRow({
  inv,
  realPct,
  onPress,
  onLongPress,
}: {
  inv: Investment;
  realPct?: number | null;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const instrument = instrumentById(inv.type);

  const subtitle = [
    inv.ticker ?? instrument?.label ?? inv.type,
    `${qtyFmt.format(inv.quantity)} ${instrument?.quantityLabel.toLowerCase() ?? ""}`.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && (onPress || onLongPress) ? { opacity: 0.6 } : null]}
    >
      <View style={[styles.icon, { backgroundColor: (instrument?.color ?? colors.border) + "33" }]}>
        <Text style={styles.iconText}>{instrument?.icon ?? "💎"}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {inv.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.right}>
        <MoneyAmount ars={inv.current_value_ars} usd={inv.current_value_usd} size="sm" />
        <PnLBadge pct={inv.profit_loss_pct} realPct={realPct} />
      </View>
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
  right: { alignItems: "flex-end", gap: 4 },
});
