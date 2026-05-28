import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CurrencyToggle } from "../../components/CurrencyToggle";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { useCurrencyStore } from "../../lib/store/currency";
import { colors } from "../../lib/colors";

export default function DashboardScreen() {
  const display = useCurrencyStore((s) => s.display);
  const usdType = useCurrencyStore((s) => s.usdType);
  const rates = useExchangeRates();
  const currentRate = rates.data?.[usdType];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Hola 👋</Text>
        <Text style={styles.subtitle}>
          Acá va a vivir tu Dashboard Patrimonial (Sprint 1).
        </Text>
        <CurrencyToggle />
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Patrimonio Total</Text>
          {(display === "ars" || display === "both") && (
            <Text style={styles.cardAmountArs}>— ARS</Text>
          )}
          {(display === "usd" || display === "both") && (
            <Text style={styles.cardAmountUsd}>— USD</Text>
          )}
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>USD {usdType.toUpperCase()}</Text>
          <Text style={styles.rateValue}>
            {rates.isLoading
              ? "..."
              : currentRate
                ? `$${currentRate.toLocaleString("es-AR")}`
                : "sin dato"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { flex: 1, padding: 20, gap: 12 },
  greeting: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 12 },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cardLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  cardAmountArs: { color: colors.ars, fontSize: 28, fontWeight: "700" },
  cardAmountUsd: { color: colors.usd, fontSize: 18, fontWeight: "500" },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  rateLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  rateValue: { color: colors.usd, fontSize: 13, fontWeight: "600" },
});
