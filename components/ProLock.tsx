// Estado "bloqueado por Pro" para las pantallas de IA (Sprint 10: monetización).
// Se muestra cuando usePro() devuelve Free. CTA → paywall. OTA-safe (JS puro).
//
// Puente Free→Pro (rewarded ads): cuando la pantalla pasa onWatchAd, además del
// CTA al paywall ofrecemos "mirá un anuncio y usá la IA una vez". La pantalla
// dueña otorga el crédito server-side (useRewardCredits) y desbloquea al ganarlo.

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

export function ProLock({
  title,
  subtitle,
  onWatchAd,
  watching = false,
}: {
  title: string;
  subtitle: string;
  onWatchAd?: () => void;
  watching?: boolean;
}) {
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
      {onWatchAd ? (
        <>
          <Text style={styles.or}>o probala gratis</Text>
          <Pressable
            style={({ pressed }) => [styles.adCta, (pressed || watching) && { opacity: 0.7 }]}
            onPress={onWatchAd}
            disabled={watching}
            accessibilityRole="button"
            accessibilityLabel="Mirá un anuncio para usar la IA una vez"
          >
            {watching ? (
              <ActivityIndicator size="small" color={colors.primaryBright} />
            ) : (
              <Ionicons name="play-circle-outline" size={16} color={colors.primaryBright} />
            )}
            <Text style={styles.adCtaText}>Mirá un anuncio y usala una vez</Text>
          </Pressable>
        </>
      ) : null}
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
  or: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  adCta: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.surfaceDark, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderWidth: 1, borderColor: colors.primaryBright + "55",
  },
  adCtaText: { color: colors.primaryBright, fontWeight: "700", fontSize: 14 },
});
