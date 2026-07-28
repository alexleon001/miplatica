// Eliminar cuenta. Requisito de Google Play para apps con registro: el borrado
// tiene que poder pedirse desde la app (esta pantalla) y desde una URL pública
// (web/eliminar-cuenta.html). Llama a la edge `delete-account`, que borra el
// usuario de auth y todo lo que cuelga de él en cascada.

import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { usePro } from "../lib/hooks/use-pro";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

const CONFIRM_WORD = "ELIMINAR";
const SUBSCRIPTION_URL = "https://play.google.com/store/account/subscriptions";

const WHAT_GETS_DELETED = [
  "Tu perfil, cuentas y saldos",
  "Movimientos, presupuestos y categorías",
  "Inversiones, deudas y metas de ahorro",
  "Proyección de pagos y recordatorios",
  "Historial del asesor y conexión con Mercado Pago",
  "Los grupos de gastos compartidos que hayas creado",
];

export default function DeleteAccountScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { isPro } = usePro();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD && !busy;

  function askConfirmation() {
    Alert.alert(
      "¿Eliminar tu cuenta?",
      "Se borra todo y no se puede deshacer. No hay forma de recuperar tus datos después.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar cuenta", style: "destructive", onPress: deleteAccount },
      ],
    );
  }

  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", {
      body: { confirm: CONFIRM_WORD },
    });
    if (error) {
      setBusy(false);
      Alert.alert(
        "No pudimos borrar la cuenta",
        "Probá de nuevo en un rato. Si sigue fallando, escribinos a alexanderleon001@gmail.com y la borramos a mano.",
      );
      return;
    }
    // El usuario ya no existe: cerramos sesión localmente (el listener de auth
    // limpia el cache de queries y el gate del layout manda al login).
    await supabase.auth.signOut();
    setBusy(false);
    Alert.alert("Cuenta eliminada", "Listo. Tus datos se borraron. Gracias por haber usado Mi Plata.");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Eliminar cuenta", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={c.accent} />
          </Pressable>
        </View>

        <Text style={styles.title}>Eliminar cuenta</Text>
        <Text style={styles.subtitle}>
          Vas a borrar la cuenta de {session?.user.email ?? "este dispositivo"} y todos sus datos. Es
          permanente: no hay copia ni forma de recuperarlos.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Qué se borra</Text>
          {WHAT_GETS_DELETED.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Ionicons name="close-circle" size={16} color={c.neg} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.cardNote}>
            En los grupos de gastos compartidos de otras personas, tus gastos quedan cargados (para no
            romperles los saldos) pero sin tu nombre ni tus datos.
          </Text>
        </View>

        {isPro ? (
          <Pressable style={styles.warnCard} onPress={() => Linking.openURL(SUBSCRIPTION_URL)} accessibilityRole="link">
            <Ionicons name="warning-outline" size={20} color={c.warn} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>Cancelá Mi Plata Pro primero</Text>
              <Text style={styles.warnText}>
                Borrar la cuenta NO cancela la suscripción: se cancela en Google Play. Tocá acá para
                abrir tus suscripciones.
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Escribí {CONFIRM_WORD} para habilitar el botón</Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={c.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel={`Escribí ${CONFIRM_WORD} para confirmar`}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.deleteBtn, !canDelete && styles.deleteBtnDisabled, pressed && canDelete && { opacity: 0.85 }]}
          onPress={askConfirmation}
          disabled={!canDelete}
          accessibilityRole="button"
          accessibilityLabel="Eliminar mi cuenta"
        >
          {busy ? (
            <ActivityIndicator color={c.neg} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={canDelete ? c.neg : c.textFaint} />
              <Text style={[styles.deleteBtnText, !canDelete && { color: c.textFaint }]}>Eliminar mi cuenta</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footNote}>
          ¿Querés irte pero guardar tus números? Cerrá esta pantalla y exportá tus movimientos a CSV
          desde Más → Datos antes de borrar.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
    headerRow: { flexDirection: "row", alignItems: "center" },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    subtitle: { fontSize: 14, lineHeight: 20, color: c.textDim, marginTop: -spacing.sm },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: c.text },
    bulletRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.text },
    cardNote: { fontSize: 13, lineHeight: 18, color: c.textDim, marginTop: spacing.xs },
    warnCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      backgroundColor: withAlpha(c.warn, 0.12),
      borderWidth: 1,
      borderColor: withAlpha(c.warn, 0.4),
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    warnTitle: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: c.text },
    warnText: { fontSize: 13, lineHeight: 18, color: c.textDim, marginTop: 2 },
    section: { gap: spacing.sm },
    fieldLabel: { fontSize: 13, lineHeight: 18, color: c.textDim },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: c.text,
      fontSize: 16,
      letterSpacing: 1,
    },
    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: withAlpha(c.neg, 0.13),
      borderWidth: 1,
      borderColor: withAlpha(c.neg, 0.4),
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    deleteBtnDisabled: { backgroundColor: c.surface, borderColor: c.border },
    deleteBtnText: { color: c.neg, fontWeight: "700", fontSize: 15 },
    footNote: { fontSize: 12, lineHeight: 17, color: c.textFaint, textAlign: "center" },
  });
}
