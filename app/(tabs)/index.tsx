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
import { SharedExpensesCard } from "../../components/SharedExpensesCard";
import { UpcomingReminders } from "../../components/UpcomingReminders";
import { useAuth } from "../../lib/auth";
import { useFreshNetWorth } from "../../lib/hooks/use-net-worth";
import { useProfile } from "../../lib/hooks/use-profile";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { useNetWorthHistoryStore } from "../../lib/store/networth-history";
import { useTheme } from "../../lib/theme-context";

export default function DashboardScreen() {
  const c = useTheme();
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { refreshing, onRefresh } = usePullRefresh();
  const { data: netWorth } = useFreshNetWorth();
  const recordNetWorth = useNetWorthHistoryStore((s) => s.record);
  const name = profile?.name?.trim() || session?.user.email?.split("@")[0] || "";
  const initial = (name || "?").charAt(0).toUpperCase();

  // Snapshot diario del patrimonio para el mini-gráfico de evolución.
  useEffect(() => {
    if (netWorth?.net_ars != null) recordNetWorth(netWorth.net_ars, netWorth.net_usd ?? null);
  }, [netWorth?.net_ars, netWorth?.net_usd, recordNetWorth]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: c.textDim }]}>Mi Plata</Text>
            <Text style={[styles.greeting, { color: c.text }]}>Hola, {name || "👋"}</Text>
          </View>
          <View style={[styles.avatar, { borderColor: c.border }]}>
            <Text style={[styles.avatarText, { color: c.text }]}>{initial}</Text>
          </View>
        </View>

        <CurrencyToggle />
        <NetWorthCard />
        <NetWorthChart />
        {/* El banner vivía al final del scroll: un usuario Free que no scrolleaba
            casi no lo veía (hallazgo s17). Acá queda cerca del pliegue, después
            del héroe, sin tapar nada. Para los Pro no renderiza nada. */}
        <AdBanner />
        <FirstSteps />
        <UpcomingReminders />
        <BudgetBanner />
        <AccountsList />
        <SharedExpensesCard />

        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={[styles.ratesLabel, { color: c.textDim }]}>Tipo de cambio hoy</Text>
          <ExchangeRatesBar />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 22, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 10.5, fontWeight: "600", letterSpacing: 0.5, marginBottom: 5 },
  greeting: { fontSize: 21, fontWeight: "600", letterSpacing: -0.4 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "600" },
  ratesLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
});
