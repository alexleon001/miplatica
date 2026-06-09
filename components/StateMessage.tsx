// Mensaje de estado reutilizable (loading / empty / error) para listas y cards.
// Centraliza el "Cargando…" / vacío / error con reintento que antes se repetía
// en cada pantalla.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../lib/theme";

type Kind = "loading" | "empty" | "error";

type IoniconName = keyof typeof Ionicons.glyphMap;

const ICON: Record<Kind, { name: IoniconName; color: string }> = {
  loading: { name: "hourglass-outline", color: colors.textMuted },
  empty: { name: "file-tray-outline", color: colors.textMuted },
  error: { name: "alert-circle-outline", color: colors.negative },
};

export function StateMessage({ kind = "empty", message, onRetry, actionLabel, onAction, actionIcon }: Props) {
  const icon = ICON[kind];
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon.name} size={26} color={icon.color} />
      </View>
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
      {/* CTA accionable (estados vacíos): un botón sólido que dispara la acción
          principal de la pantalla (p. ej. abrir el modal de alta). */}
      {kind !== "error" && actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
          onPress={onAction}
        >
          {actionIcon ? <Ionicons name={actionIcon} size={16} color="#FFFFFF" /> : null}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type Props = {
  kind?: Kind;
  message: string;
  onRetry?: () => void;
  // CTA opcional para estados vacíos (no error): botón sólido con la acción
  // principal de la pantalla.
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IoniconName;
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["3xl"], paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  errorText: { color: colors.negative },
  retry: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.primaryBright, fontWeight: "700" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
