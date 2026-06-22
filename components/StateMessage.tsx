// Mensaje de estado reutilizable (loading / empty / error) para listas y cards.
// Centraliza el "Cargando…" / vacío / error con reintento que antes se repetía
// en cada pantalla. Rediseño "Línea": useTheme().

import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

type Kind = "loading" | "empty" | "error";

type IoniconName = keyof typeof Ionicons.glyphMap;

const ICON_NAME: Record<Kind, IoniconName> = {
  loading: "hourglass-outline",
  empty: "file-tray-outline",
  error: "alert-circle-outline",
};

export function StateMessage({ kind = "empty", message, onRetry, actionLabel, onAction, actionIcon }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const iconColor = kind === "error" ? c.neg : c.textDim;
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={ICON_NAME[kind]} size={26} color={iconColor} />
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
          {actionIcon ? <Ionicons name={actionIcon} size={16} color={c.accentContrast} /> : null}
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    wrap: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["3xl"], paddingHorizontal: spacing.xl },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    text: { fontSize: 15, lineHeight: 21, color: c.textDim, textAlign: "center" },
    errorText: { color: c.neg },
    retry: {
      borderWidth: 1,
      borderColor: c.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    retryText: { color: c.accent, fontWeight: "700" },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    actionText: { color: c.accentContrast, fontWeight: "700", fontSize: 15 },
  });
}
