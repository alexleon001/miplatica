// Estado "bloqueado por Pro" para las pantallas de IA (Sprint 10: monetización).
// Se muestra cuando usePro() devuelve Free. CTA → paywall. OTA-safe (JS puro).

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

export function ProLock({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.iconRing}>
        <Ionicons name="sparkles" size={30} color={colors.primaryBright} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
        onPress={() => router.push("/paywall")}
        accessibilityRole="button"
        accessibilityLabel="Ver Mi Platica Pro"
      >
        <Ionicons name="lock-open-outline" size={16} color="#FFFFFF" />
        <Text style={styles.ctaText}>Desbloquear con Pro</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
  },
  iconRing: {
    width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBright + "44",
    marginBottom: spacing.xs,
  },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: "center" },
  subtitle: { ...typography.caption, color: colors.textMuted, textAlign: "center", lineHeight: 19, maxWidth: 300 },
  cta: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.sm, ...shadow.md,
  },
  ctaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
