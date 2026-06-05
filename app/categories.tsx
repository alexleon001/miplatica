// Gestión de categorías personalizadas. El usuario crea categorías de gasto o
// ingreso (label + emoji + color) que se suman a las built-in en los selectores
// de movimientos y presupuestos. Local por dispositivo (store custom-categories).
// La IA sigue sugiriendo sólo las built-in; las custom se asignan a mano.

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES } from "../lib/categories";
import { useCustomCategoriesStore } from "../lib/store/custom-categories";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

const PALETTE = [
  "#F97316", "#84CC16", "#EF4444", "#3B82F6", "#A855F7", "#06B6D4",
  "#10B981", "#6366F1", "#EC4899", "#0EA5E9", "#F59E0B", "#22C55E",
];

const SUGGESTED_EMOJIS = ["🏷️", "🐶", "🎮", "💪", "🎁", "🍷", "💅", "⛽", "🚬", "📱", "🧾", "🏦"];

export default function CategoriesScreen() {
  const router = useRouter();
  const custom = useCustomCategoriesStore((s) => s.categories);
  const add = useCustomCategoriesStore((s) => s.add);
  const remove = useCustomCategoriesStore((s) => s.remove);

  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [group, setGroup] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState(PALETTE[0]);

  function submit() {
    const name = label.trim();
    if (!name) {
      Alert.alert("Falta el nombre", "Ponele un nombre a la categoría.");
      return;
    }
    add({ label: name, icon: icon.trim() || "🏷️", color, group });
    setLabel("");
    setIcon("🏷️");
  }

  function confirmRemove(id: string, name: string) {
    Alert.alert(
      "Borrar categoría",
      `¿Borrar "${name}"? Los movimientos que la tengan quedarán sin categoría.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Borrar", style: "destructive", onPress: () => remove(id) },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Categorías", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={colors.primaryBright} />
          </Pressable>
        </View>

        <Text style={styles.title}>Categorías</Text>
        <Text style={styles.subtitle}>Creá las tuyas para clasificar mejor tus movimientos.</Text>

        {/* Alta */}
        <View style={styles.card}>
          <View style={styles.previewRow}>
            <View style={[styles.previewChip, { backgroundColor: color + "22" }]}>
              <Text style={styles.previewEmoji}>{icon || "🏷️"}</Text>
            </View>
            <TextInput
              placeholder="Nombre (ej: Mascota, Gimnasio)"
              placeholderTextColor={colors.textMuted}
              value={label}
              onChangeText={setLabel}
              style={styles.nameInput}
            />
          </View>

          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.chipRow}>
            <Chip label="Gasto" active={group === "expense"} onPress={() => setGroup("expense")} />
            <Chip label="Ingreso" active={group === "income"} onPress={() => setGroup("income")} />
          </View>

          <Text style={styles.fieldLabel}>Ícono</Text>
          <View style={styles.emojiRow}>
            <TextInput
              value={icon}
              onChangeText={(t) => setIcon([...t].slice(-1).join(""))}
              style={styles.emojiInput}
              maxLength={4}
            />
            <View style={styles.emojiSuggestions}>
              {SUGGESTED_EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => setIcon(e)} style={[styles.emojiPick, icon === e && styles.emojiPickActive]}>
                  <Text style={styles.emojiPickText}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.paletteRow}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
                accessibilityLabel={`Color ${c}`}
              >
                {color === c ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </Pressable>
            ))}
          </View>

          <Pressable style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }]} onPress={submit}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>Crear categoría</Text>
          </Pressable>
        </View>

        {/* Custom del usuario */}
        <Text style={styles.sectionLabel}>Tus categorías</Text>
        {custom.length === 0 ? (
          <Text style={styles.empty}>Todavía no creaste ninguna. Las de arriba son las que vienen por defecto.</Text>
        ) : (
          custom.map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={[styles.rowChip, { backgroundColor: c.color + "22" }]}>
                <Text style={styles.previewEmoji}>{c.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{c.label}</Text>
                <Text style={styles.rowHint}>{c.group === "expense" ? "Gasto" : "Ingreso"}</Text>
              </View>
              <Pressable onPress={() => confirmRemove(c.id, c.label)} hitSlop={10} style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="trash-outline" size={18} color={colors.negative} />
              </Pressable>
            </View>
          ))
        )}

        {/* Built-in (referencia) */}
        <Text style={styles.sectionLabel}>Por defecto</Text>
        <View style={styles.builtinWrap}>
          {CATEGORIES.filter((c) => c.group === "expense" || c.group === "income").map((c) => (
            <View key={c.id} style={styles.builtinChip}>
              <Text style={styles.builtinText}>{c.icon} {c.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  previewChip: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  previewEmoji: { fontSize: 22 },
  nameInput: {
    flex: 1,
    backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  fieldLabel: { ...typography.overline, color: colors.textMuted },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  emojiRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  emojiInput: {
    width: 56,
    height: 48,
    backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 24,
    textAlign: "center",
  },
  emojiSuggestions: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  emojiPick: {
    width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border,
  },
  emojiPickActive: { borderColor: colors.primaryBright, backgroundColor: colors.primarySoft },
  emojiPickText: { fontSize: 18 },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: colors.textPrimary },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  sectionLabel: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  rowChip: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  rowHint: { ...typography.caption, color: colors.textMuted },
  delBtn: { padding: spacing.xs },
  builtinWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  builtinChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  builtinText: { ...typography.caption, color: colors.textSecondary, fontSize: 12 },
});
