// Primitivas de formulario compartidas. Antes cada modal repetía el mismo
// bloque de estilos (field/label/input/chip/submit) + el contenedor
// SafeAreaView + scroll teclado-aware. Esto lo centraliza.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { KeyboardAwareScrollView } from "./KeyboardAwareScrollView";
import { colors, radius, spacing, typography } from "../lib/theme";

// Contenedor estándar de un modal-formulario (con scroll teclado-aware).
export function FormScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>{children}</KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FormInput({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...props} />;
}

export function FormChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function SubmitButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, (busy || disabled) && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={busy || disabled}
    >
      <Text style={styles.submitText}>{label}</Text>
    </Pressable>
  );
}

// Estilos compartidos expuestos para casos puntuales (hints, help, multiline…).
export const form = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.overline, color: colors.textMuted },
  input: {
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
});

const styles = StyleSheet.create({
  safe: form.safe,
  container: form.container,
  field: form.field,
  fieldLabel: form.fieldLabel,
  hint: form.hint,
  input: form.input,
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
