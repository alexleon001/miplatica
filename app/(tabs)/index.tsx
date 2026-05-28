import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountsList } from "../../components/AccountsList";
import { CurrencyToggle } from "../../components/CurrencyToggle";
import { ExchangeRatesBar } from "../../components/ExchangeRatesBar";
import { NetWorthCard } from "../../components/NetWorthCard";
import { useAuth } from "../../lib/auth";
import { useProfile } from "../../lib/hooks/use-profile";
import { usePullRefresh } from "../../lib/hooks/use-pull-refresh";
import { colors } from "../../lib/colors";

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function DashboardScreen() {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { refreshing, onRefresh } = usePullRefresh();
  const name = profile?.name?.trim() || session?.user.email?.split("@")[0] || "";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola{name ? `, ${name}` : ""} 👋</Text>
          <Text style={styles.date}>{fechaFmt.format(new Date())}</Text>
        </View>

        <CurrencyToggle />
        <NetWorthCard />
        <AccountsList />

        <View style={styles.ratesSection}>
          <Text style={styles.ratesLabel}>Tipo de cambio hoy</Text>
          <ExchangeRatesBar />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 16 },
  header: { gap: 4 },
  greeting: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  date: { color: colors.textMuted, fontSize: 13, textTransform: "capitalize" },
  ratesSection: { gap: 8, marginTop: 4 },
  ratesLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
});
