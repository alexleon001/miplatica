import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/colors";

export default function DebtsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Deudas</Text>
        <Text style={styles.muted}>
          Tarjetas, préstamos y cuotas con próximos vencimientos (Sprint 6).
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { flex: 1, padding: 20, gap: 8 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  muted: { color: colors.textMuted },
});
