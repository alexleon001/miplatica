import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BudgetsList } from "../../components/BudgetsList";
import { MercadoPagoConnect } from "../../components/MercadoPagoConnect";
import { SavingsGoalsList } from "../../components/SavingsGoalsList";
import { CtaButton, IconChip, ScreenTitle, SectionLabel } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useProfile } from "../../lib/hooks/use-profile";
import { useNotifPrefsStore } from "../../lib/store/notif-prefs";
import { colors, radius, spacing, typography, shadow } from "../../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function MoreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const notif = useNotifPrefsStore();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Ups", error.message);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenTitle>Más</ScreenTitle>

        <FeatureCard
          icon="sparkles"
          tint={colors.primary}
          title="Asesor financiero IA"
          subtitle="Chateá sobre tu plata con contexto real"
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
          onPress={() => router.push("/monthly-summary")}
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
          <SectionLabel>Datos</SectionLabel>
          <MercadoPagoConnect />
          <View style={styles.dataDivider} />
          <CtaButton
            label="Importar movimientos (CSV de broker)"
            icon="document-text-outline"
            variant="outline"
            onPress={() => router.push("/modals/import-broker-csv")}
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
  onPress,
}: {
  icon: IoniconName;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.featureCard, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <IconChip icon={icon} tint={tint} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
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
    padding: spacing.lg,
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  featureTitle: { ...typography.heading, color: colors.textPrimary },
  featureSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
