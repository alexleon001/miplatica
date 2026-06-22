import { Pressable, StyleSheet, Text, View } from "react-native";
import { instrumentById } from "../lib/instruments";
import type { Investment } from "../lib/hooks/use-investments";
import { isPriceStale, staleLabel } from "../lib/prices";
import { useTheme } from "../lib/theme-context";
import { withAlpha } from "../lib/theme-tokens";
import { MoneyAmount } from "./MoneyAmount";
import { PnLBadge } from "./PnLBadge";

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
  const c = useTheme();
  const instrument = instrumentById(inv.type);
  const isFci = inv.type === "fci";

  // Solo instrumentos con cotización live pueden quedar "desactualizados". Los FCI
  // se refrescan client-side con el VCP del día (freshenFci), no se marcan stale.
  const stale = !!instrument?.hasLivePrice && !isFci && isPriceStale(inv.last_updated);

  // El "ticker" de un FCI es un slug feo (ALPHA-PESOS-CLASE-A); mostramos su
  // categoría/label en vez del slug.
  const subtitle = [
    isFci ? (instrument?.label ?? "FCI") : (inv.ticker ?? instrument?.label ?? inv.type),
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
      <View style={[styles.icon, { backgroundColor: withAlpha(instrument?.color ?? c.textFaint, 0.18), borderColor: c.border }]}>
        <Text style={styles.iconText}>{instrument?.icon ?? "💎"}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {inv.name}
        </Text>
        <Text style={[styles.sub, { color: c.textDim }]} numberOfLines={1}>
          {subtitle}
        </Text>
        {stale ? (
          <Text style={[styles.stale, { color: c.warn }]} numberOfLines={1}>
            ⚠ {staleLabel(inv.last_updated)}
          </Text>
        ) : null}
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
  stale: { fontSize: 11, fontWeight: "600" },
  right: { alignItems: "flex-end", gap: 4 },
});
