import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { colors } from "../../lib/colors";

export default function MoreScreen() {
  const { session } = useAuth();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Ups", error.message);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Más</Text>
        <Text style={styles.muted}>Presupuestos, metas y configuración (Sprint 6).</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sesión</Text>
          <Text style={styles.email}>{session?.user.email ?? "—"}</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={signOut}
          >
            <Text style={styles.btnText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  muted: { color: colors.textMuted },
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: 16,
  },
  sectionLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  email: { color: colors.textPrimary, fontSize: 16 },
  btn: {
    backgroundColor: colors.negative,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: colors.textPrimary, fontWeight: "600" },
});
