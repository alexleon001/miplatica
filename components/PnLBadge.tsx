// Badge reutilizable de ganancia/pérdida (P&L). Muestra el % nominal con flecha
// y color. Opcionalmente, debajo, el rendimiento REAL (ajustado por inflación,
// regla #5): "real +Y%" en verde/rojo según le gane o no a la inflación.
// Se usa por posición (InvestmentRow) y en el resumen del portafolio.

import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../lib/theme";

type Size = "sm" | "md";

const pctFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export function PnLBadge({
  pct,
  realPct,
  size = "sm",
}: {
  pct: number | null | undefined;
  realPct?: number | null;
  size?: Size;
}) {
  if (pct == null) {
    return <Text style={[styles.neutral, size === "md" && styles.mdText]}>—</Text>;
  }

  const positive = pct >= 0;
  const color = positive ? colors.positive : colors.negative;
  const arrow = positive ? "▲" : "▼";

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: color + "22" }, size === "md" && styles.mdBadge]}>
        <Text style={[styles.text, { color }, size === "md" && styles.mdText]}>
          {arrow} {pctFmt.format(pct)}%
        </Text>
      </View>
      {realPct != null && (
        <Text
          style={[styles.real, { color: realPct >= 0 ? colors.positive : colors.negative }, size === "md" && styles.realMd]}
        >
          real {pctFmt.format(realPct)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-end", gap: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: "flex-end",
  },
  mdBadge: { paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 12, fontWeight: "700" },
  mdText: { fontSize: 15 },
  real: { fontSize: 10, fontWeight: "600", opacity: 0.9 },
  realMd: { fontSize: 12 },
  neutral: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
});
