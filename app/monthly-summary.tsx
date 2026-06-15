// Resumen mensual generado por IA: panorama del mes, top categorías, comparación
// con el mes anterior e impacto de inflación. Llama al Edge monthly-summary (que
// agrega los números server-side) y cachea el resultado. Botón "Actualizar"
// fuerza un refetch.

import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProLock } from "../components/ProLock";
import { RewardCreditsChip } from "../components/RewardCreditsChip";
import { StateMessage } from "../components/StateMessage";
import { usePro } from "../lib/hooks/use-pro";
import { invalidateRewardCredits, useRewardCredits } from "../lib/hooks/use-reward-credits";
import { currentPeriod, useMonthlySummary } from "../lib/hooks/use-monthly-summary";
import { monthLabel } from "../lib/projection";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

export default function MonthlySummaryScreen() {
  const router = useRouter();
  const period = currentPeriod();
  const { isPro } = usePro();
  // Puente Free→Pro: un crédito de rewarded ad alcanza para un resumen.
  const reward = useRewardCredits({ enabled: !isPro });
  // Acceso a la IA: Pro, con crédito, o ya tenemos el resumen (ya se "pagó").
  const canCall = isPro || reward.credits > 0;
  // No llamamos a la IA sin acceso (la query queda deshabilitada → no gasta).
  const { data, isLoading, isFetching, isError, refetch } = useMonthlySummary(period, canCall);
  const hasAccess = canCall || data != null;

  // Cada resumen generado consumió un crédito server-side (si no es Pro):
  // refrescamos el saldo. Una vez por resumen distinto.
  const settledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isPro && data && settledRef.current !== data.summary) {
      settledRef.current = data.summary;
      invalidateRewardCredits();
    }
  }, [isPro, data]);

  async function handleWatchAd() {
    const result = await reward.watchAdForCredit();
    if (result === "no_credit") {
      Alert.alert("Por hoy no", "Llegaste al tope de usos gratis de hoy. Probá mañana o pasate a Pro.");
    } else if (result === "unavailable") {
      Alert.alert("Anuncio no disponible", "No pudimos cargar el anuncio. Probá de nuevo en un rato.");
    }
    // earned → la query se habilita sola y genera el resumen; dismissed → sin acción.
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Resumen del mes", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={colors.primaryBright} />
          </Pressable>
          <View style={styles.headerActions}>
            {data ? (
              <Pressable
                onPress={() => Share.share({ message: `Resumen de ${monthLabel(period)} — Mi Platica\n\n${data.summary.trim()}` }).catch(() => {})}
                hitSlop={12}
                style={styles.refreshBtn}
                accessibilityLabel="Compartir resumen"
              >
                <Ionicons name="share-outline" size={18} color={colors.primaryBright} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => refetch()}
              hitSlop={12}
              disabled={isFetching}
              style={styles.refreshBtn}
              accessibilityLabel="Actualizar resumen"
            >
              <Ionicons name="refresh" size={18} color={isFetching ? colors.textMuted : colors.primaryBright} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>Resumen de {monthLabel(period)}</Text>
        <Text style={styles.subtitle}>Tu mes financiero, contado por la IA con tus números reales.</Text>
        <RewardCreditsChip credits={reward.credits} isPro={isPro} />

        {!hasAccess ? (
          <ProLock
            title="El resumen del mes es Pro"
            subtitle="La IA analiza tus movimientos, los compara con el mes anterior y con la inflación. Desbloquealo con Mi Platica Pro."
            onWatchAd={reward.adsAvailable ? handleWatchAd : undefined}
            watching={reward.watching}
          />
        ) : isLoading || (isFetching && !data) ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primaryBright} />
            <Text style={styles.loadingText}>Analizando tus movimientos…</Text>
          </View>
        ) : isError ? (
          <StateMessage kind="error" message="No pude generar el resumen. Probá de nuevo." onRetry={() => refetch()} />
        ) : data ? (
          <View style={styles.card}>
            <Text style={styles.body}>{data.summary.trim()}</Text>
            {isFetching ? <Text style={styles.updating}>Actualizando…</Text> : null}
          </View>
        ) : (
          <StateMessage kind="empty" message="Cargá movimientos del mes para ver tu resumen." />
        )}

        <Text style={styles.disclaimer}>
          Orientativo, generado por IA a partir de tus datos. No es asesoramiento financiero profesional.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  refreshBtn: {
    width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceDark, borderWidth: 1, borderColor: colors.border,
  },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted },
  loading: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["3xl"] },
  loadingText: { ...typography.caption, color: colors.textMuted },
  card: {
    backgroundColor: colors.surfaceDark, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs, ...shadow.sm,
  },
  body: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
  updating: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  disclaimer: { ...typography.caption, color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
});
