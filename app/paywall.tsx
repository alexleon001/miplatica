// Paywall de Mi Platica Pro (Sprint 10: monetización). La IA es Pro: esta pantalla
// presenta los beneficios y deja elegir plan. La compra va por RevenueCat
// (lib/purchases.ts, Fase 2): si la capa está disponible compra de verdad
// (los precios reales de la tienda pisan los hardcodeados) y el webhook escribe
// el entitlement; si no (APK sin el módulo nativo, API key sin configurar),
// cae al stub informativo de siempre.
//
// En __DEV__ hay un atajo para simular el entitlement (useProDevStore) y poder
// probar el desbloqueo de las features de IA sin la pasarela.

import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandGradient } from "../components/BrandGradient";
import { refreshProSoon } from "../lib/hooks/use-pro";
import {
  getProOfferings,
  purchasePro,
  restorePro,
  type ProOfferings,
} from "../lib/purchases";
import { useProDevStore } from "../lib/store/pro";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

type Plan = "annual" | "monthly";

const BENEFITS: { icon: IoniconName; title: string; subtitle: string }[] = [
  { icon: "sparkles", title: "Asistente de finanzas IA", subtitle: "Chateá sobre tu plata con contexto real, cuando quieras" },
  { icon: "newspaper-outline", title: "Resumen del mes con IA", subtitle: "Qué pasó con tu plata, contado y comparado con inflación" },
  { icon: "pricetags-outline", title: "Categorización automática", subtitle: "La IA ordena tus movimientos sin categoría de una" },
  { icon: "remove-circle-outline", title: "Sin anuncios", subtitle: "Toda la app, limpia y sin interrupciones" },
];

export default function PaywallScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("annual");
  const [offerings, setOfferings] = useState<ProOfferings | null>(null);
  const [busy, setBusy] = useState(false);
  const setDevOverride = useProDevStore((s) => s.setDevOverride);

  // Paquetes reales de RevenueCat (null si la capa no está disponible →
  // seguimos con precios hardcodeados + stub de compra).
  useEffect(() => {
    let alive = true;
    void getProOfferings().then((o) => {
      if (alive) setOfferings(o);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function startPurchase() {
    const pkg = plan === "annual" ? offerings?.annual : offerings?.monthly;
    if (!pkg) {
      // Stub: RevenueCat no disponible todavía en este build/entorno.
      Alert.alert(
        "Suscripción en camino",
        "Las compras se habilitan en la próxima versión (estamos integrando el pago). ¡Gracias por el aguante!",
      );
      return;
    }
    setBusy(true);
    const result = await purchasePro(pkg);
    setBusy(false);
    if (result === "purchased") {
      refreshProSoon();
      Alert.alert(
        "¡Ya sos Pro! 🎉",
        "Gracias por el aguante. La IA se desbloquea en unos segundos.",
        [{ text: "Dale", onPress: () => router.back() }],
      );
    } else if (result === "error" || result === "unavailable") {
      Alert.alert("No pudimos completar la compra", "No se te cobró nada. Probá de nuevo en un rato.");
    }
    // cancelled → el usuario cerró el flujo de pago, no molestamos.
  }

  async function restorePurchases() {
    setBusy(true);
    const restored = await restorePro();
    setBusy(false);
    if (restored) {
      refreshProSoon();
      Alert.alert("Compras restauradas", "Tu Pro vuelve a estar activo.", [
        { text: "Dale", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Nada para restaurar", "No encontramos una suscripción activa con esta cuenta de Google Play.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Mi Plata Pro", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.closeRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar" style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={c.textDim} />
          </Pressable>
        </View>

        <BrandGradient style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>Tu plata, con inteligencia</Text>
          <Text style={styles.heroSubtitle}>
            Desbloqueá toda la IA de Mi Plata y sacá los anuncios.
          </Text>
        </BrandGradient>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={18} color={c.accent} />
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
          price={
            offerings?.annual ? `${offerings.annual.product.priceString} / año` : "US$ 19,99 / año"
          }
          hint="2 meses gratis vs. el mensual"
          badge="Mejor precio"
        />
        <PlanCard
          active={plan === "monthly"}
          onPress={() => setPlan("monthly")}
          title="Mensual"
          price={
            offerings?.monthly ? `${offerings.monthly.product.priceString} / mes` : "US$ 2,49 / mes"
          }
          hint="Cancelás cuando quieras"
        />

        <Pressable
          style={({ pressed }) => [styles.cta, (pressed || busy) && { opacity: 0.88 }]}
          onPress={startPurchase}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {busy
              ? "Procesando…"
              : plan === "annual"
                ? "Empezar con el plan anual"
                : "Empezar con el plan mensual"}
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          Precio en moneda local según tu tienda. La suscripción se renueva sola; la cancelás desde Google Play
          cuando quieras. La IA es orientativa, no es asesoramiento financiero profesional.
        </Text>

        <Pressable onPress={restorePurchases} disabled={busy} hitSlop={8} accessibilityRole="button">
          <Text style={styles.restore}>¿Ya pagaste Pro? Restaurar compras</Text>
        </Pressable>

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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
          color={active ? c.accent : c.textDim}
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, paddingBottom: spacing["4xl"], gap: spacing.md },
    closeRow: { flexDirection: "row", justifyContent: "flex-end" },
    closeBtn: {
      width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    },
    hero: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.27),
      ...shadow.glow,
    },
    heroBadge: {
      flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: spacing.sm, paddingVertical: 3,
      borderRadius: radius.full,
    },
    heroBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11, letterSpacing: 1 },
    heroTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: "#FFFFFF", marginTop: spacing.xs },
    heroSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.9)", lineHeight: 21 },
    benefits: {
      backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderWidth: 1, borderColor: c.border, gap: spacing.lg, ...shadow.sm,
    },
    benefitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    benefitIcon: {
      width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
      backgroundColor: c.accentSoft,
    },
    benefitTitle: { fontSize: 15, fontWeight: "700", color: c.text },
    benefitSubtitle: { fontSize: 13, color: c.textDim, marginTop: 1 },
    planCard: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderWidth: 1, borderColor: c.border,
    },
    planCardActive: { borderColor: c.accent, backgroundColor: c.surface2 },
    planLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
    planTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    planTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    planBadge: { backgroundColor: c.posSoft, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.full },
    planBadgeText: { color: c.pos, fontWeight: "800", fontSize: 10, letterSpacing: 0.5 },
    planHint: { fontSize: 13, color: c.textDim, marginTop: 1 },
    planPrice: { fontSize: 15, fontWeight: "700", color: c.text, textAlign: "right", flexShrink: 1 },
    cta: {
      backgroundColor: c.accent, borderRadius: radius.full, paddingVertical: spacing.lg,
      alignItems: "center", marginTop: spacing.xs, ...shadow.md,
    },
    ctaText: { color: c.accentContrast, fontWeight: "800", fontSize: 16 },
    legal: { fontSize: 11, color: c.textDim, lineHeight: 16, marginTop: spacing.xs },
    restore: {
      fontSize: 13, color: c.textDim, fontWeight: "700",
      textAlign: "center", paddingVertical: spacing.sm, textDecorationLine: "underline",
    },
    devBox: {
      marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md,
      borderWidth: 1, borderColor: withAlpha(c.warn, 0.33), backgroundColor: c.warnSoft, gap: spacing.sm,
    },
    devLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.warn },
    devRow: { flexDirection: "row", gap: spacing.sm },
    devBtn: {
      flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.sm,
      backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border,
    },
    devBtnText: { fontSize: 13, color: c.textDim, fontWeight: "700" },
  });
}
