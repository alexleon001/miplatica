import { useEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountsList } from "../../components/AccountsList";
import { AdBanner } from "../../components/AdBanner";
import { BudgetBanner } from "../../components/BudgetBanner";
import { CurrencyToggle } from "../../components/CurrencyToggle";
import { ExchangeRatesBar } from "../../components/ExchangeRatesBar";
import { FirstSteps } from "../../components/FirstSteps";
import { NetWorthCard } from "../../components/NetWorthCard";
import { NetWorthChart } from "../../components/NetWorthChart";
import { UpcomingReminders } from "../../components/UpcomingReminders";
import { useAuth } from "../../lib/auth";
import { useFreshNetWorth } from "../../lib/hooks/use-net-worth";
import { useProfile } from "../../lib/hooks/use-profile";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { useNetWorthHistoryStore } from "../../lib/store/networth-history";
import { colors, radius, spacing, typography } from "../../lib/theme";

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function DashboardScreen() {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { refreshing, onRefresh } = usePullRefresh();
  const { data: netWorth } = useFreshNetWorth();
  const recordNetWorth = useNetWorthHistoryStore((s) => s.record);
  const name = profile?.name?.trim() || session?.user.email?.split("@")[0] || "";
  const initial = (name || "?").charAt(0).toUpperCase();

  // Snapshot diario del patrimonio (un punto por día) para el mini-gráfico de
  // evolución. Local; se va llenando a medida que el usuario abre la app.
  useEffect(() => {
    if (netWorth?.net_ars != null) recordNetWorth(netWorth.net_ars, netWorth.net_usd ?? null);
  }, [netWorth?.net_ars, netWorth?.net_usd, recordNetWorth]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>Mi Platica</Text>
              <View style={styles.brandDot} />
            </View>
            <Text style={styles.greeting}>Hola{name ? `, ${name}` : ""} 👋</Text>
            <Text style={styles.date}>{fechaFmt.format(new Date())}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        <CurrencyToggle />
        <FirstSteps />
        <UpcomingReminders />
        <BudgetBanner />
        <NetWorthCard />
        <NetWorthChart />
        <AccountsList />

        <View style={styles.ratesSection}>
          <Text style={styles.ratesLabel}>Tipo de cambio hoy</Text>
          <ExchangeRatesBar />
        </View>

        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerText: { gap: 2, flex: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  brand: { color: colors.primaryBright, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  greeting: { ...typography.title, color: colors.textPrimary },
  date: { ...typography.caption, color: colors.textMuted, textTransform: "capitalize" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primaryBright, fontSize: 18, fontWeight: "800" },
  ratesSection: { gap: spacing.sm, marginTop: spacing.xs },
  ratesLabel: { ...typography.overline, color: colors.textMuted },
});
