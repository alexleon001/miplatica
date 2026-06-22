// Primitivas de UI compartidas del design system. Centralizan los patrones que
// antes se repetían en cada pantalla (FAB, cards, títulos, CTAs, barras de
// progreso) para que todo comparta el mismo lenguaje visual.
// Rediseño "Línea": usan useTheme() para reaccionar al tema en vivo.

import type { ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import { withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function ScreenTitle({ children }: { children: ReactNode }) {
  const c = useTheme();
  return <Text style={[styles.screenTitle, { color: c.text }]}>{children}</Text>;
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <Text style={[styles.sectionLabel, { color: c.textDim }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
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
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        { bottom: spacing.xl + bottomInset, backgroundColor: c.accent },
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={c.accentContrast} />
      <Text style={[styles.fabText, { color: c.accentContrast }]}>{label}</Text>
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
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cta,
        variant === "soft" ? { backgroundColor: c.accentSoft } : { borderWidth: 1, borderColor: c.accent },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
    >
      {icon ? <Ionicons name={icon} size={16} color={c.accent} /> : null}
      <Text style={[styles.ctaText, { color: c.accent }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

// Barra de progreso (presupuestos, metas).
export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const c = useTheme();
  return (
    <View style={[styles.barBg, { backgroundColor: c.surface2 }]}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

// Chip de ícono cuadrado con tinte (filas de cuentas/movimientos/etc).
export function IconChip({ icon, tint, size = 38 }: { icon: IoniconName; tint: string; size?: number }) {
  return (
    <View style={[styles.iconChip, { width: size, height: size, backgroundColor: withAlpha(tint, 0.14) }]}>
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3 },
  sectionLabel: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.sm,
    ...shadow.sm,
  },
  fab: {
    position: "absolute",
    right: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    ...shadow.md,
  },
  fabText: { fontWeight: "700", fontSize: 15 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  ctaText: { fontWeight: "700", fontSize: 14, flexShrink: 1, textAlign: "center" },
  barBg: { height: 8, borderRadius: radius.full, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radius.full },
  iconChip: { borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
