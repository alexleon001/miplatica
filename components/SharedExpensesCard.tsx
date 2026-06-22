// Card del dashboard que resume los gastos compartidos: el neto agregado del
// usuario en todos sus grupos (te deben / debés) o una invitación a empezar.

import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { IconChip } from "./ui";
import { useGroups, useMyGroupBalances } from "../lib/hooks/use-groups";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing, shadow } from "../lib/theme";

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function SharedExpensesCard() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const groups = useGroups();
  const balances = useMyGroupBalances();

  // No mostramos nada hasta tener data (evita parpadeo en el dashboard).
  if (groups.isLoading || !groups.data) return null;

  const hasGroups = groups.data.length > 0;
  const net = Object.values(balances.data ?? {}).reduce((s, n) => s + n, 0);
  const atEven = Math.abs(net) < 0.5;
  const positive = net > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      onPress={() => router.push("/groups")}
      accessibilityRole="button"
      accessibilityLabel="Gastos compartidos"
    >
      <IconChip icon="people" tint={c.accent} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Gastos compartidos</Text>
        {!hasGroups ? (
          <Text style={styles.subtitle}>Dividí viajes, convivencia y salidas con amigos</Text>
        ) : atEven ? (
          <Text style={styles.subtitle}>Estás a mano en todos tus grupos</Text>
        ) : (
          <Text style={[styles.subtitle, positive ? { color: c.pos } : { color: c.neg }]}>
            {positive ? "Te deben " : "Debés "}{arsFmt.format(Math.abs(net))} en total
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textDim} />
    </Pressable>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      ...shadow.sm,
    },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    subtitle: { fontSize: 13, lineHeight: 18, color: c.textDim, marginTop: 2 },
  });
}
