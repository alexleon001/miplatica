import { useMemo } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppearanceSettings } from "../../components/AppearanceSettings";
import { BudgetsList } from "../../components/BudgetsList";
import { MercadoPagoConnect } from "../../components/MercadoPagoConnect";
import { RecurringList } from "../../components/RecurringList";
import { SavingsGoalsList } from "../../components/SavingsGoalsList";
import { CtaButton, IconChip } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { usePro } from "../../lib/hooks/use-pro";
import { useProfile } from "../../lib/hooks/use-profile";
import { useNotifPrefsStore } from "../../lib/store/notif-prefs";
import { countryConfig } from "../../lib/countries";
import { useCurrencyStore } from "../../lib/store/currency";
import { transactionsToCsv } from "../../lib/csv-export";
import { useTheme } from "../../lib/theme-context";
import { type Palette, withAlpha } from "../../lib/theme-tokens";
import { radius, spacing } from "../../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

// Requisito de Google Play: la política debe ser accesible desde la app.
const PRIVACY_POLICY_URL = "https://miplatica.vercel.app/privacidad.html";

export default function MoreScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { isPro } = usePro();
  const notif = useNotifPrefsStore();
  const country = useCurrencyStore((s) => s.country);
  // Features atadas a Argentina: Mercado Pago (sin API de pagos en VE) y el
  // simulador de inversiones (instrumentos AR + "ganarle a la inflación").
  const showMercadoPago = countryConfig(country).features.mercadoPago;
  const showInflationFeatures = countryConfig(country).features.inflation;

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Ups", error.message);
  }

  async function exportMonthCsv() {
    const now = new Date();
    const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data, error } = await supabase
      .from("transactions")
      .select("date, type, category, merchant, description, amount_ars, amount_usd")
      .gte("date", since)
      .order("date", { ascending: true })
      .limit(2000);
    if (error) {
      Alert.alert("Ups", "No pude leer los movimientos.");
      return;
    }
    if (!data || data.length === 0) {
      Alert.alert("Sin movimientos", "No hay movimientos este mes para exportar.");
      return;
    }
    try {
      await Share.share({ message: transactionsToCsv(data) });
    } catch {
      // usuario canceló
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Más</Text>

        {!isPro ? (
          <Pressable
            style={({ pressed }) => [styles.proUpsell, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/paywall")}
            accessibilityRole="button"
            accessibilityLabel="Ver Mi Plata Pro"
          >
            <IconChip icon="sparkles" tint={c.accent} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proUpsellTitle}>Mejorá a Mi Plata Pro</Text>
              <Text style={styles.proUpsellSubtitle}>Desbloqueá toda la IA y sacá los anuncios</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.accent} />
          </Pressable>
        ) : null}

        <View style={styles.featureList}>
          <FeatureRow icon="people-outline" tint={c.accent} title="Gastos compartidos" subtitle="Dividí viajes, convivencia y salidas; calculamos quién le debe a quién" onPress={() => router.push("/groups")} styles={styles} c={c} />
          <FeatureRow icon="sparkles" tint={c.accent} title="Asesor financiero IA" subtitle="Chateá sobre tu plata con contexto real" pro={!isPro} onPress={() => router.push("/advisor")} styles={styles} c={c} />
          <FeatureRow icon="calendar-outline" tint={c.accent} title="Proyección de pagos" subtitle="Tu flujo de caja mes a mes, como el Excel pero solo" onPress={() => router.push("/projection")} styles={styles} c={c} />
          <FeatureRow icon="newspaper-outline" tint={c.accent} title="Resumen del mes" subtitle="Qué pasó con tu plata este mes, contado por la IA" pro={!isPro} onPress={() => router.push("/monthly-summary")} styles={styles} c={c} />
          <FeatureRow icon="bar-chart-outline" tint={c.pos} title="Insights de gastos" subtitle="Tu tendencia mensual y qué cambió" onPress={() => router.push("/insights")} styles={styles} c={c} />
          {showInflationFeatures ? (
            <FeatureRow icon="calculator-outline" tint={c.warn} title="Simulador de inversiones" subtitle="¿Dónde le ganás a la inflación?" onPress={() => router.push("/invest-sim")} styles={styles} c={c} />
          ) : null}
          <FeatureRow icon="pricetags-outline" tint={c.accent} title="Categorías" subtitle="Creá las tuyas para clasificar mejor" onPress={() => router.push("/categories")} styles={styles} c={c} />
          <FeatureRow icon="notifications-outline" tint={c.textDim} title="Alertas de cotización" subtitle="Avisame cuando el dólar cruce un valor" onPress={() => router.push("/rate-alerts")} styles={styles} c={c} last />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Presupuestos del mes</Text>
          <BudgetsList />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Metas de ahorro</Text>
          <SavingsGoalsList />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gastos recurrentes</Text>
          <RecurringList />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Datos</Text>
          {showMercadoPago ? (
            <>
              <MercadoPagoConnect />
              <View style={styles.dataDivider} />
            </>
          ) : null}
          <CtaButton
            label="Importar movimientos (CSV de broker)"
            icon="document-text-outline"
            variant="outline"
            onPress={() => router.push("/modals/import-broker-csv")}
          />
          <CtaButton
            label="Exportar movimientos del mes (CSV)"
            icon="share-outline"
            variant="outline"
            onPress={exportMonthCsv}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Apariencia</Text>
          <AppearanceSettings />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notificaciones</Text>
          <ToggleRow label="Recordatorios de vencimiento" hint="Deudas y metas, el día previo" value={notif.reminders} onValueChange={notif.setReminders} styles={styles} c={c} />
          <View style={styles.dataDivider} />
          <ToggleRow label="Alertas de presupuesto" hint="Aviso al llegar al 80% y 100%" value={notif.budgetAlerts} onValueChange={notif.setBudgetAlerts} styles={styles} c={c} />
          <View style={styles.dataDivider} />
          <ToggleRow label="Alertas de cotización" hint="Cuando el dólar cruza un umbral tuyo" value={notif.rateAlerts} onValueChange={notif.setRateAlerts} styles={styles} c={c} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Perfil</Text>
          <Text style={styles.kvLabel}>Nombre</Text>
          <Text style={styles.kvValue}>{profile?.name ?? "—"}</Text>
          <Text style={styles.kvLabel}>Ingreso mensual</Text>
          <Text style={styles.kvValue}>
            {profile?.monthly_income_ars
              ? `$${profile.monthly_income_ars.toLocaleString("es-AR")} ARS`
              : "—"}
          </Text>
          <Text style={styles.kvLabel}>Dólar preferido</Text>
          <Text style={styles.kvValue}>{profile?.preferred_usd_type?.toUpperCase() ?? "—"}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <CtaButton
              label="Editar perfil"
              icon="create-outline"
              variant="outline"
              onPress={() => router.push("/modals/edit-profile")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sesión</Text>
          <Text style={styles.kvValue}>{session?.user.email ?? "—"}</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={18} color={c.neg} />
            <Text style={styles.btnText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
          accessibilityLabel="Ver política de privacidad"
        >
          <Text style={styles.legalLinkText}>Política de privacidad</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  styles,
  c,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  styles: Styles;
  c: Palette;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: c.accent, false: c.surface2 }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function FeatureRow({
  icon,
  tint,
  title,
  subtitle,
  pro,
  onPress,
  styles,
  c,
  last,
}: {
  icon: IoniconName;
  tint: string;
  title: string;
  subtitle: string;
  pro?: boolean;
  onPress: () => void;
  styles: Styles;
  c: Palette;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.featureRow, !last && styles.featureRowBorder, pressed && { opacity: 0.6 }]}
      onPress={onPress}
    >
      <IconChip icon={icon} tint={tint} size={36} />
      <View style={{ flex: 1 }}>
        <View style={styles.featureTitleRow}>
          <Text style={styles.featureTitle}>{title}</Text>
          {pro ? (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.featureSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textDim} />
    </Pressable>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, gap: spacing.lg },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    featureList: { borderTopWidth: 1, borderTopColor: c.border },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    featureRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    featureTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    featureTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600", color: c.text },
    featureSubtitle: { fontSize: 13, lineHeight: 18, color: c.textDim, marginTop: 2 },
    proBadge: { backgroundColor: c.accentSoft, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.full },
    proBadgeText: { color: c.accent, fontWeight: "800", fontSize: 10, letterSpacing: 0.8 },
    section: {
      gap: spacing.sm,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    sectionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase", color: c.textDim },
    kvLabel: { fontSize: 13, lineHeight: 18, color: c.textDim, marginTop: spacing.sm },
    kvValue: { fontSize: 15, lineHeight: 21, color: c.text },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: withAlpha(c.neg, 0.13),
      borderWidth: 1,
      borderColor: withAlpha(c.neg, 0.4),
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      marginTop: spacing.md,
    },
    btnText: { color: c.neg, fontWeight: "700" },
    dataDivider: { height: 1, backgroundColor: c.border, marginVertical: spacing.xs },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
    toggleLabel: { fontSize: 15, lineHeight: 21, color: c.text },
    toggleHint: { fontSize: 13, lineHeight: 18, color: c.textDim },
    proUpsell: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.4),
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    proUpsellTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    proUpsellSubtitle: { fontSize: 13, lineHeight: 18, color: c.textDim, marginTop: 2 },
    legalLink: { alignSelf: "center", paddingVertical: spacing.sm },
    legalLinkText: { fontSize: 13, lineHeight: 18, color: c.textDim, textDecorationLine: "underline" },
  });
}
