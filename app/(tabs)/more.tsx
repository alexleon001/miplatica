import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BudgetsList } from "../../components/BudgetsList";
import { MercadoPagoConnect } from "../../components/MercadoPagoConnect";
import { RecurringList } from "../../components/RecurringList";
import { SavingsGoalsList } from "../../components/SavingsGoalsList";
import { CtaButton, IconChip, ScreenTitle, SectionLabel } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { usePro } from "../../lib/hooks/use-pro";
import { useProfile } from "../../lib/hooks/use-profile";
import { useNotifPrefsStore } from "../../lib/store/notif-prefs";
import { transactionsToCsv } from "../../lib/csv-export";
import { colors, radius, spacing, typography, shadow } from "../../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

// Requisito de Google Play: la política debe ser accesible desde la app.
const PRIVACY_POLICY_URL = "https://miplatica.vercel.app/";

export default function MoreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { isPro } = usePro();
  const notif = useNotifPrefsStore();

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
        <ScreenTitle>Más</ScreenTitle>

        {!isPro ? (
          <Pressable
            style={({ pressed }) => [styles.proUpsell, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/paywall")}
            accessibilityRole="button"
            accessibilityLabel="Ver Mi Platica Pro"
          >
            <IconChip icon="sparkles" tint={colors.primaryBright} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proUpsellTitle}>Mejorá a Mi Platica Pro</Text>
              <Text style={styles.proUpsellSubtitle}>Desbloqueá toda la IA y sacá los anuncios</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primaryBright} />
          </Pressable>
        ) : null}

        <FeatureCard
          icon="people-outline"
          tint={colors.primary}
          title="Gastos compartidos"
          subtitle="Dividí viajes, convivencia y salidas; calculamos quién le debe a quién"
          onPress={() => router.push("/groups")}
        />
        <FeatureCard
          icon="sparkles"
          tint={colors.primary}
          title="Asesor financiero IA"
          subtitle="Chateá sobre tu plata con contexto real"
          pro={!isPro}
          onPress={() => router.push("/advisor")}
        />
        <FeatureCard
          icon="calendar-outline"
          tint={colors.accent}
          title="Proyección de pagos"
          subtitle="Tu flujo de caja mes a mes, como el Excel pero solo"
          onPress={() => router.push("/projection")}
        />
        <FeatureCard
          icon="newspaper-outline"
          tint={colors.primaryBright}
          title="Resumen del mes"
          subtitle="Qué pasó con tu plata este mes, contado por la IA"
          pro={!isPro}
          onPress={() => router.push("/monthly-summary")}
        />
        <FeatureCard
          icon="bar-chart-outline"
          tint={colors.positive}
          title="Insights de gastos"
          subtitle="Tu tendencia mensual y qué cambió"
          onPress={() => router.push("/insights")}
        />
        <FeatureCard
          icon="calculator-outline"
          tint={colors.warning}
          title="Simulador de inversiones"
          subtitle="¿Dónde le ganás a la inflación?"
          onPress={() => router.push("/invest-sim")}
        />
        <FeatureCard
          icon="pricetags-outline"
          tint={colors.accent}
          title="Categorías"
          subtitle="Creá las tuyas para clasificar mejor"
          onPress={() => router.push("/categories")}
        />
        <FeatureCard
          icon="notifications-outline"
          tint={colors.usd}
          title="Alertas de cotización"
          subtitle="Avisame cuando el dólar cruce un valor"
          onPress={() => router.push("/rate-alerts")}
        />

        <View style={styles.section}>
          <SectionLabel>Presupuestos del mes</SectionLabel>
          <BudgetsList />
        </View>

        <View style={styles.section}>
          <SectionLabel>Metas de ahorro</SectionLabel>
          <SavingsGoalsList />
        </View>

        <View style={styles.section}>
          <SectionLabel>Gastos recurrentes</SectionLabel>
          <RecurringList />
        </View>

        <View style={styles.section}>
          <SectionLabel>Datos</SectionLabel>
          <MercadoPagoConnect />
          <View style={styles.dataDivider} />
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
          <SectionLabel>Notificaciones</SectionLabel>
          <ToggleRow
            label="Recordatorios de vencimiento"
            hint="Deudas y metas, el día previo"
            value={notif.reminders}
            onValueChange={notif.setReminders}
          />
          <View style={styles.dataDivider} />
          <ToggleRow
            label="Alertas de presupuesto"
            hint="Aviso al llegar al 80% y 100%"
            value={notif.budgetAlerts}
            onValueChange={notif.setBudgetAlerts}
          />
          <View style={styles.dataDivider} />
          <ToggleRow
            label="Alertas de cotización"
            hint="Cuando el dólar cruza un umbral tuyo"
            value={notif.rateAlerts}
            onValueChange={notif.setRateAlerts}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel>Perfil</SectionLabel>
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
          <SectionLabel>Sesión</SectionLabel>
          <Text style={styles.email}>{session?.user.email ?? "—"}</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
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

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
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
        trackColor={{ true: colors.primary, false: colors.surfaceSunken }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function FeatureCard({
  icon,
  tint,
  title,
  subtitle,
  pro,
  onPress,
}: {
  icon: IoniconName;
  tint: string;
  title: string;
  subtitle: string;
  pro?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.featureCard, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <IconChip icon={icon} tint={tint} size={38} />
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
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, gap: spacing.md },
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  kvLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  kvValue: { ...typography.body, color: colors.textPrimary },
  email: { ...typography.body, color: colors.textPrimary },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.negative,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700" },
  dataDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.xs },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  toggleLabel: { ...typography.body, color: colors.textPrimary },
  toggleHint: { ...typography.caption, color: colors.textMuted },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.sm,
  },
  featureTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  featureTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  featureSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  proBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.full },
  proBadgeText: { color: colors.primaryBright, fontWeight: "800", fontSize: 10, letterSpacing: 0.8 },
  proUpsell: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryBright + "55",
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  proUpsellTitle: { ...typography.heading, color: colors.textPrimary },
  proUpsellSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  legalLink: { alignSelf: "center", paddingVertical: spacing.sm },
  legalLinkText: { ...typography.caption, color: colors.textMuted, textDecorationLine: "underline" },
});
