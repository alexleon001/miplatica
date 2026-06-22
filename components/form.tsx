// Primitivas de formulario compartidas. Antes cada modal repetía el mismo
// bloque de estilos (field/label/input/chip/submit) + el contenedor
// SafeAreaView + scroll teclado-aware. Esto lo centraliza.
// Rediseño "Línea": los componentes usan useTheme() para reaccionar al tema en
// vivo. El StyleSheet `form` exportado queda con la paleta base (compat con los
// pocos modales que componen sobre `form.input`/`form.multiline`; se migran en F9).

import { type ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { KeyboardAwareScrollView } from "./KeyboardAwareScrollView";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

// Contenedor estándar de un modal-formulario (con scroll teclado-aware).
export function FormScreen({ title, children }: { title: string; children: ReactNode }) {
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title }} />
      <KeyboardAwareScrollView contentContainerStyle={s.container}>{children}</KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FormInput({ style, ...props }: TextInputProps) {
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return <TextInput placeholderTextColor={c.textDim} style={[s.input, style]} {...props} />;
}

export function FormChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={staticStyles.row}>{children}</View>;
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
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.submit, pressed && { opacity: 0.85 }, (busy || disabled) && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={busy || disabled}
    >
      <Text style={s.submitText}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, gap: spacing.lg },
    field: { gap: spacing.sm },
    fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase", color: c.textDim },
    hint: { fontSize: 13, color: c.textDim, lineHeight: 18 },
    input: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 16,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.textDim, fontWeight: "600", fontSize: 13 },
    chipTextActive: { color: c.accentContrast },
    submit: {
      backgroundColor: c.accent,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    submitText: { color: c.accentContrast, fontWeight: "700", fontSize: 16 },
  });
}

const staticStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});

// Helpers de layout puro (sin color) que algunos modales componen sobre los
// FormInput themed (ej: textarea multilínea). Los estilos con color viven en
// makeStyles (themed); acá solo va lo agnóstico al tema.
export const form = StyleSheet.create({
  multiline: { minHeight: 70, textAlignVertical: "top" },
});
