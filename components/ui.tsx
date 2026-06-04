// Primitivas de UI compartidas del design system. Centralizan los patrones que
// antes se repetían en cada pantalla (FAB, cards, títulos, CTAs, barras de
// progreso) para que todo comparta el mismo lenguaje visual.

import type { ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Botón de acción flotante (esquina inferior derecha de las listas).
// `bottomInset`: separación extra del borde inferior. En pantallas de stack (sin
// tab bar) pasarle el safe-area inset para que no quede bajo la barra de
// navegación del sistema; en tabs el tab bar ya da la separación (default 0).
export function Fab({
  label,
  icon = "add",
  onPress,
  bottomInset = 0,
}: {
  label: string;
  icon?: IoniconName;
  onPress: () => void;
  bottomInset?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        { bottom: spacing.xl + bottomInset },
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color="#FFFFFF" />
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

// CTA inline. `variant`: soft (relleno tenue, default) | outline.
export function CtaButton({
  label,
  icon,
  onPress,
  variant = "soft",
  disabled,
}: {
  label: string;
  icon?: IoniconName;
  onPress: () => void;
  variant?: "soft" | "outline";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cta,
        variant === "soft" ? styles.ctaSoft : styles.ctaOutline,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
    >
      {icon ? <Ionicons name={icon} size={16} color={colors.primaryBright} /> : null}
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

// Barra de progreso (presupuestos, metas).
export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

// Chip de ícono cuadrado con tinte (filas de cuentas/movimientos/etc).
export function IconChip({ icon, tint, size = 38 }: { icon: IoniconName; tint: string; size?: number }) {
  return (
    <View style={[styles.iconChip, { width: size, height: size, backgroundColor: tint + "22" }]}>
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenTitle: { ...typography.title, color: colors.textPrimary },
  sectionLabel: { ...typography.overline, color: colors.textMuted },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow.sm,
  },
  fab: {
    position: "absolute",
    right: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    ...shadow.md,
  },
  fabText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  ctaSoft: { backgroundColor: colors.primarySoft },
  ctaOutline: { borderWidth: 1, borderColor: colors.primary },
  ctaText: { color: colors.primaryBright, fontWeight: "700", fontSize: 14 },
  barBg: { height: 8, backgroundColor: colors.surfaceSunken, borderRadius: radius.full, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radius.full },
  iconChip: { borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
