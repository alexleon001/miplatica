// Mensaje de estado reutilizable (loading / empty / error) para listas y cards.
// Centraliza el "Cargando…" / vacío / error con reintento que antes se repetía
// en cada pantalla.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/colors";

type Kind = "loading" | "empty" | "error";

type Props = {
  kind?: Kind;
  message: string;
  onRetry?: () => void;
};

export function StateMessage({ kind = "empty", message, onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, kind === "error" && styles.errorText]}>{message}</Text>
      {kind === "error" && onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 12, paddingVertical: 24, paddingHorizontal: 20 },
  text: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  errorText: { color: colors.negative },
  retry: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: colors.primary, fontWeight: "600" },
});
