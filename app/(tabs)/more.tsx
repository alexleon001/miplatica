import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BudgetsList } from "../../components/BudgetsList";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useProfile } from "../../lib/hooks/use-profile";
import { colors } from "../../lib/colors";

export default function MoreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Ups", error.message);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Más</Text>

        <Pressable
          style={({ pressed }) => [styles.advisorBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/advisor")}
        >
          <Text style={styles.advisorIcon}>🧉</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.advisorTitle}>Asesor financiero IA</Text>
            <Text style={styles.advisorSubtitle}>Chateá sobre tu plata con contexto real</Text>
          </View>
          <Text style={styles.advisorChevron}>›</Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Presupuestos del mes</Text>
          <BudgetsList />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Datos</Text>
          <Pressable
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/modals/import-broker-csv")}
          >
            <Text style={styles.linkBtnText}>Importar movimientos (CSV de broker)</Text>
          </Pressable>
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
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 12 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  kvLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  kvValue: { color: colors.textPrimary, fontSize: 15 },
  email: { color: colors.textPrimary, fontSize: 16 },
  btn: {
    backgroundColor: colors.negative,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  btnText: { color: colors.textPrimary, fontWeight: "600" },
  linkBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  linkBtnText: { color: colors.primary, fontWeight: "600" },
  advisorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primary + "22",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  advisorIcon: { fontSize: 28 },
  advisorTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  advisorSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  advisorChevron: { color: colors.primary, fontSize: 24, fontWeight: "700" },
});
