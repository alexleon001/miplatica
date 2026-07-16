// Lista de grupos de gastos compartidos. Entrada de la feature (también linkeada
// desde Más y desde una card del dashboard). Muestra el saldo neto del usuario en
// cada grupo. Free: 1 grupo activo; el alta del 2° deriva al paywall.

import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fab, IconChip } from "../../components/ui";
import { useGroups, useMyGroupBalances } from "../../lib/hooks/use-groups";
import type { ExpenseGroup, GroupKind } from "../../lib/groups-types";
import { usePro } from "../../lib/hooks/use-pro";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { radius, spacing, shadow } from "../../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

// Ícono/etiqueta por tipo de grupo. El tinte se resuelve contra el tema vivo
// (kindTint) para reaccionar al selector de Apariencia.
export const KIND_META: Record<GroupKind, { icon: IoniconName; label: string }> = {
  trip: { icon: "airplane", label: "Viaje" },
  household: { icon: "home", label: "Convivencia" },
  outing: { icon: "beer", label: "Salida" },
  other: { icon: "people", label: "Grupo" },
};

export function kindTint(c: Palette, kind: GroupKind): string {
  switch (kind) {
    case "trip": return c.textDim;
    case "household": return c.accent;
    case "outing": return c.warn;
    default: return c.accent;
  }
}

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function GroupsScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const groups = useGroups();
  const balances = useMyGroupBalances();
  const { isPro } = usePro();

  const list = groups.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {groups.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : list.length === 0 ? (
        <EmptyState onCreate={() => router.push("/modals/add-group")} styles={styles} c={c} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.container}
          ListHeaderComponent={
            !isPro ? (
              <View style={styles.limitNote}>
                <Ionicons name="information-circle-outline" size={16} color={c.textDim} />
                <Text style={styles.limitNoteText}>
                  Plan gratis: 1 grupo activo. Pasá a Pro para grupos ilimitados.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <GroupRow
              group={item}
              net={balances.data?.[item.id] ?? 0}
              onPress={() => router.push(`/groups/${item.id}`)}
              styles={styles}
              c={c}
            />
          )}
        />
      )}
      <Fab label="Nuevo grupo" bottomInset={insets.bottom} onPress={() => router.push("/modals/add-group")} />
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function GroupRow({ group, net, onPress, styles, c }: { group: ExpenseGroup; net: number; onPress: () => void; styles: Styles; c: Palette }) {
  const meta = KIND_META[group.kind] ?? KIND_META.other;
  const atEven = Math.abs(net) < 0.5;
  const positive = net > 0;
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <IconChip icon={meta.icon} tint={kindTint(c, group.kind)} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{group.name}</Text>
        <Text style={styles.rowKind}>{meta.label}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.balanceLabel, atEven ? { color: c.textDim } : positive ? { color: c.pos } : { color: c.neg }]}>
          {atEven ? "A mano" : positive ? "Te deben" : "Debés"}
        </Text>
        {!atEven ? (
          <Text style={[styles.balanceAmount, positive ? { color: c.pos } : { color: c.neg }]}>
            {arsFmt.format(Math.abs(net))}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textDim} />
    </Pressable>
  );
}

function EmptyState({ onCreate, styles, c }: { onCreate: () => void; styles: Styles; c: Palette }) {
  return (
    <View style={styles.empty}>
      <IconChip icon="people" tint={c.accent} size={64} />
      <Text style={styles.emptyTitle}>Dividí gastos con quien quieras</Text>
      <Text style={styles.emptyText}>
        Armá un grupo para un viaje, la convivencia o una salida. Cargá los gastos y Mi Plata calcula quién le debe a quién.
      </Text>
      <Pressable style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]} onPress={onCreate}>
        <Ionicons name="add" size={18} color={c.accentContrast} />
        <Text style={styles.emptyCtaText}>Crear mi primer grupo</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { padding: spacing.xl, gap: spacing.md, paddingBottom: 96 },
    limitNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    limitNoteText: { fontSize: 13, color: c.textDim, flex: 1 },
    row: {
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
    rowName: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    rowKind: { fontSize: 13, color: c.textDim, marginTop: 2 },
    balanceLabel: { fontSize: 13, fontWeight: "700" },
    balanceAmount: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: spacing.md },
    emptyTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text, textAlign: "center", marginTop: spacing.md },
    emptyText: { fontSize: 15, color: c.textDim, textAlign: "center", lineHeight: 22 },
    emptyCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      marginTop: spacing.md,
    },
    emptyCtaText: { color: c.accentContrast, fontWeight: "700", fontSize: 15 },
  });
}
