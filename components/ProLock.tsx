// Estado "bloqueado por Pro" para las pantallas de IA (Sprint 10: monetización).
// Se muestra cuando usePro() devuelve Free. CTA → paywall. OTA-safe (JS puro).
//
// Puente Free→Pro (rewarded ads): cuando la pantalla pasa onWatchAd, además del
// CTA al paywall ofrecemos "mirá un anuncio y usá la IA una vez". La pantalla
// dueña otorga el crédito server-side (useRewardCredits) y desbloquea al ganarlo.

import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.iconRing}>
        <Ionicons name="sparkles" size={30} color={c.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
        onPress={() => router.push("/paywall")}
        accessibilityRole="button"
        accessibilityLabel="Ver Mi Plata Pro"
      >
        <Ionicons name="lock-open-outline" size={16} color={c.accentContrast} />
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
              <ActivityIndicator size="small" color={c.accent} />
            ) : (
              <Ionicons name="play-circle-outline" size={16} color={c.accent} />
            )}
            <Text style={styles.adCtaText}>Mirá un anuncio y usala una vez</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing["3xl"],
      paddingHorizontal: spacing.lg,
    },
    iconRing: {
      width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
      backgroundColor: c.accentSoft, borderWidth: 1, borderColor: withAlpha(c.accent, 0.27),
      marginBottom: spacing.xs,
    },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text, textAlign: "center" },
    subtitle: { fontSize: 13, color: c.textDim, textAlign: "center", lineHeight: 19, maxWidth: 300 },
    cta: {
      flexDirection: "row", alignItems: "center", gap: spacing.xs,
      backgroundColor: c.accent, borderRadius: radius.full,
      paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.sm, ...shadow.md,
    },
    ctaText: { color: c.accentContrast, fontWeight: "800", fontSize: 15 },
    or: { fontSize: 13, color: c.textDim, marginTop: spacing.xs },
    adCta: {
      flexDirection: "row", alignItems: "center", gap: spacing.xs,
      backgroundColor: c.surface, borderRadius: radius.full,
      paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
      borderWidth: 1, borderColor: withAlpha(c.accent, 0.33),
    },
    adCtaText: { color: c.accent, fontWeight: "700", fontSize: 14 },
  });
}
