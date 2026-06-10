// Paywall de Mi Platica Pro (Sprint 10: monetización). La IA es Pro: esta pantalla
// presenta los beneficios y deja elegir plan. La COMPRA todavía es un stub —
// RevenueCat se cablea en Fase 2 (dep nativa → requiere rebuild). `startPurchase`
// está aislado para que enchufar RevenueCat sea un cambio de una sola función.
//
// En __DEV__ hay un atajo para simular el entitlement (useProDevStore) y poder
// probar el desbloqueo de las features de IA sin la pasarela.

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandGradient } from "../components/BrandGradient";
import { useProDevStore } from "../lib/store/pro";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

type Plan = "annual" | "monthly";

const BENEFITS: { icon: IoniconName; title: string; subtitle: string }[] = [
  { icon: "sparkles", title: "Asesor financiero IA", subtitle: "Chateá sobre tu plata con contexto real, cuando quieras" },
  { icon: "newspaper-outline", title: "Resumen del mes con IA", subtitle: "Qué pasó con tu plata, contado y comparado con inflación" },
  { icon: "pricetags-outline", title: "Categorización automática", subtitle: "La IA ordena tus movimientos sin categoría de una" },
  { icon: "remove-circle-outline", title: "Sin anuncios", subtitle: "Toda la app, limpia y sin interrupciones" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("annual");
  const setDevOverride = useProDevStore((s) => s.setDevOverride);

  // Stub de compra. En Fase 2 esto llama a RevenueCat (Purchases.purchasePackage)
  // y el webhook escribe el entitlement; usePro() lo refleja al instante.
  function startPurchase() {
    Alert.alert(
      "Suscripción en camino",
      "Las compras se habilitan en la próxima versión (estamos integrando el pago). ¡Gracias por el aguante!",
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Mi Platica Pro", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.closeRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar" style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <BrandGradient style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>Tu plata, con inteligencia argentina</Text>
          <Text style={styles.heroSubtitle}>
            Desbloqueá toda la IA de Mi Platica y sacá los anuncios.
          </Text>
        </BrandGradient>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={18} color={colors.primaryBright} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSubtitle}>{b.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <PlanCard
          active={plan === "annual"}
          onPress={() => setPlan("annual")}
          title="Anual"
          price="US$ 19,99 / año"
          hint="Equivale a ~US$ 1,67/mes · 2 meses gratis"
          badge="Mejor precio"
        />
        <PlanCard
          active={plan === "monthly"}
          onPress={() => setPlan("monthly")}
          title="Mensual"
          price="US$ 2,49 / mes"
          hint="Cancelás cuando quieras"
        />

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
          onPress={startPurchase}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {plan === "annual" ? "Empezar con el plan anual" : "Empezar con el plan mensual"}
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          Precio en moneda local según tu tienda. La suscripción se renueva sola; la cancelás desde Google Play
          cuando quieras. La IA es orientativa, no es asesoramiento financiero profesional.
        </Text>

        {__DEV__ ? (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>DEV · simular entitlement</Text>
            <View style={styles.devRow}>
              <Pressable style={styles.devBtn} onPress={() => { setDevOverride(true); router.back(); }}>
                <Text style={styles.devBtnText}>Forzar Pro</Text>
              </Pressable>
              <Pressable style={styles.devBtn} onPress={() => { setDevOverride(false); router.back(); }}>
                <Text style={styles.devBtnText}>Forzar Free</Text>
              </Pressable>
              <Pressable style={styles.devBtn} onPress={() => setDevOverride(null)}>
                <Text style={styles.devBtnText}>Real</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  active,
  onPress,
  title,
  price,
  hint,
  badge,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  price: string;
  hint: string;
  badge?: string;
}) {
  return (
    <Pressable
      style={[styles.planCard, active && styles.planCardActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.planLeft}>
        <Ionicons
          name={active ? "radio-button-on" : "radio-button-off"}
          size={20}
          color={active ? colors.primaryBright : colors.textMuted}
        />
        <View>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{title}</Text>
            {badge ? (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planHint}>{hint}</Text>
        </View>
      </View>
      <Text style={styles.planPrice}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, paddingBottom: spacing["4xl"], gap: spacing.md },
  closeRow: { flexDirection: "row", justifyContent: "flex-end" },
  closeBtn: {
    width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceDark, borderWidth: 1, borderColor: colors.border,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBright + "44",
    ...shadow.glow,
  },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full,
  },
  heroBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  heroTitle: { ...typography.title, color: "#FFFFFF", marginTop: spacing.xs },
  heroSubtitle: { ...typography.body, color: "rgba(255,255,255,0.9)", lineHeight: 21 },
  benefits: {
    backgroundColor: colors.surfaceDark, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.lg, ...shadow.sm,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  benefitIcon: {
    width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  benefitTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  benefitSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  planCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surfaceDark, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  planCardActive: { borderColor: colors.primaryBright, backgroundColor: colors.surfaceElevated },
  planLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  planTitle: { ...typography.heading, color: colors.textPrimary },
  planBadge: { backgroundColor: colors.positiveSoft, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.full },
  planBadgeText: { color: colors.positive, fontWeight: "800", fontSize: 10, letterSpacing: 0.5 },
  planHint: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  planPrice: { ...typography.bodyStrong, color: colors.textPrimary, textAlign: "right", flexShrink: 1 },
  cta: {
    backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.lg,
    alignItems: "center", marginTop: spacing.xs, ...shadow.md,
  },
  ctaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  legal: { ...typography.caption, color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  devBox: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.warning + "55", backgroundColor: colors.warningSoft, gap: spacing.sm,
  },
  devLabel: { ...typography.overline, color: colors.warning },
  devRow: { flexDirection: "row", gap: spacing.sm },
  devBtn: {
    flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border,
  },
  devBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: "700" },
});
