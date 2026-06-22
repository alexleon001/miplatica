// Chip informativo para usuarios Free: cuántos usos de IA (créditos ganados con
// rewarded ads) les quedan. Ayuda a que entiendan el modelo "mirá un anuncio =
// 1 uso" antes de chocar con el 402. No renderiza nada si es Pro o sin créditos.
// OTA-safe (JS puro). Rediseño "Línea": useTheme().

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

export function RewardCreditsChip({ credits, isPro }: { credits: number; isPro: boolean }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  if (isPro || credits <= 0) return null;
  return (
    <View style={styles.chip}>
      <Ionicons name="ticket-outline" size={13} color={c.accent} />
      <Text style={styles.text}>
        {credits === 1 ? "Te queda 1 uso de IA gratis" : `Te quedan ${credits} usos de IA gratis`}
      </Text>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      alignSelf: "flex-start",
      backgroundColor: c.accentSoft,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.2),
    },
    text: { fontSize: 13, color: c.accent, fontWeight: "700" },
  });
}
