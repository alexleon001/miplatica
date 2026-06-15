// Chip informativo para usuarios Free: cuántos usos de IA (créditos ganados con
// rewarded ads) les quedan. Ayuda a que entiendan el modelo "mirá un anuncio =
// 1 uso" antes de chocar con el 402. No renderiza nada si es Pro o sin créditos.
// OTA-safe (JS puro).

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../lib/theme";

export function RewardCreditsChip({ credits, isPro }: { credits: number; isPro: boolean }) {
  if (isPro || credits <= 0) return null;
  return (
    <View style={styles.chip}>
      <Ionicons name="ticket-outline" size={13} color={colors.primaryBright} />
      <Text style={styles.text}>
        {credits === 1 ? "Te queda 1 uso de IA gratis" : `Te quedan ${credits} usos de IA gratis`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primaryBright + "33",
  },
  text: { ...typography.caption, color: colors.primaryBright, fontWeight: "700" },
});
