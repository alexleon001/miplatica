// Badge reutilizable de ganancia/pérdida (P&L). Muestra el % con flecha y color.
// Se usa por posición (InvestmentRow) y en el resumen del portafolio.

import { StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/colors";

type Size = "sm" | "md";

const pctFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export function PnLBadge({ pct, size = "sm" }: { pct: number | null | undefined; size?: Size }) {
  if (pct == null) {
    return <Text style={[styles.neutral, size === "md" && styles.mdText]}>—</Text>;
  }

  const positive = pct >= 0;
  const color = positive ? colors.positive : colors.negative;
  const arrow = positive ? "▲" : "▼";

  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }, size === "md" && styles.mdBadge]}>
      <Text style={[styles.text, { color }, size === "md" && styles.mdText]}>
        {arrow} {pctFmt.format(pct)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  mdBadge: { paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 12, fontWeight: "700" },
  mdText: { fontSize: 15 },
  neutral: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
});
