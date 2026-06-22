import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDebts } from "../lib/hooks/use-debts";
import { useSavingsGoals } from "../lib/hooks/use-savings-goals";
import { buildReminders, reminderBody, upcomingReminders } from "../lib/reminders";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

// Banner de vencimientos próximos (≤14 días) y atrasados. Si no hay nada
// relevante, no renderiza. Tocar un ítem lleva a la pantalla correspondiente.
export function UpcomingReminders() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const debts = useDebts();
  const goals = useSavingsGoals();

  if (!debts.data || !goals.data) return null;

  const all = buildReminders(debts.data, goals.data);
  const relevant = upcomingReminders(all, 14);
  if (relevant.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="notifications" size={15} color={c.warn} />
        <Text style={styles.title}>Vencimientos</Text>
      </View>
      {relevant.slice(0, 4).map((r) => {
        const overdue = r.daysUntil < 0;
        const soon = r.daysUntil >= 0 && r.daysUntil <= 3;
        const dot = overdue ? c.neg : soon ? c.warn : c.accent;
        const dest = r.kind === "debt" ? "/(tabs)/debts" : "/(tabs)/more";

        return (
          <Pressable
            key={r.id}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(dest)}
          >
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text style={styles.text} numberOfLines={2}>
              {reminderBody(r)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: withAlpha(c.warn, 0.27),
      gap: spacing.md,
      ...shadow.sm,
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    title: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: c.text },
    row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    text: { fontSize: 13, color: c.textDim, flex: 1, lineHeight: 18 },
  });
}
