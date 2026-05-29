// Pantalla de retorno del OAuth de Mercado Pago. El callback (Edge) redirige
// acá vía deep link `miplatica://mp-connected?ok=1` (o ?error=...). Muestra el
// resultado, refresca el estado de conexión y vuelve a la pestaña "Más".

import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../lib/colors";

export default function MpConnected() {
  const router = useRouter();
  const qc = useQueryClient();
  const { ok, error } = useLocalSearchParams<{ ok?: string; error?: string }>();
  const success = ok === "1";

  useEffect(() => {
    // Refrescar el estado de conexión y volver a "Más".
    qc.invalidateQueries({ queryKey: ["mp_connection"] });
    const t = setTimeout(() => router.replace("/(tabs)/more"), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.icon}>{success ? "✅" : "⚠️"}</Text>
        <Text style={styles.title}>
          {success ? "¡Mercado Pago conectado!" : "No se pudo conectar"}
        </Text>
        {!success && error ? <Text style={styles.detail}>{error}</Text> : null}
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Volviendo a la app…</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  icon: { fontSize: 48 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "700", textAlign: "center" },
  detail: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  loader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  muted: { color: colors.textMuted, fontSize: 13 },
});
