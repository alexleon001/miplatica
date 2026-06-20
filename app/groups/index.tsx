// Lista de grupos de gastos compartidos. Entrada de la feature (también linkeada
// desde Más y desde una card del dashboard). Muestra el saldo neto del usuario en
// cada grupo. Free: 1 grupo activo; el alta del 2° deriva al paywall.

import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fab, IconChip } from "../../components/ui";
import { useGroups, useMyGroupBalances } from "../../lib/hooks/use-groups";
import type { ExpenseGroup, GroupKind } from "../../lib/groups-types";
import { usePro } from "../../lib/hooks/use-pro";
import { colors, radius, spacing, typography, shadow } from "../../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

export const KIND_META: Record<GroupKind, { icon: IoniconName; label: string; tint: string }> = {
  trip: { icon: "airplane", label: "Viaje", tint: colors.usd },
  household: { icon: "home", label: "Convivencia", tint: colors.primary },
  outing: { icon: "beer", label: "Salida", tint: colors.warning },
  other: { icon: "people", label: "Grupo", tint: colors.accent },
};

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function GroupsScreen() {
  const router = useRouter();
  const groups = useGroups();
  const balances = useMyGroupBalances();
  const { isPro } = usePro();

  const list = groups.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {groups.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : list.length === 0 ? (
        <EmptyState onCreate={() => router.push("/modals/add-group")} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.container}
          ListHeaderComponent={
            !isPro ? (
              <View style={styles.limitNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={styles.limitNoteText}>
                  Plan gratis: 1 grupo activo. Pasá a Pro para grupos ilimitados.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <GroupRow
              group={item}
              net={balances.data?.get(item.id) ?? 0}
              onPress={() => router.push(`/groups/${item.id}`)}
            />
          )}
        />
      )}
      <Fab label="Nuevo grupo" onPress={() => router.push("/modals/add-group")} />
    </SafeAreaView>
  );
}

function GroupRow({ group, net, onPress }: { group: ExpenseGroup; net: number; onPress: () => void }) {
  const meta = KIND_META[group.kind] ?? KIND_META.other;
  const atEven = Math.abs(net) < 0.5;
  const positive = net > 0;
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <IconChip icon={meta.icon} tint={meta.tint} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{group.name}</Text>
        <Text style={styles.rowKind}>{meta.label}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.balanceLabel, atEven ? { color: colors.textMuted } : positive ? { color: colors.positive } : { color: colors.negative }]}>
          {atEven ? "A mano" : positive ? "Te deben" : "Debés"}
        </Text>
        {!atEven ? (
          <Text style={[styles.balanceAmount, positive ? { color: colors.positive } : { color: colors.negative }]}>
            {arsFmt.format(Math.abs(net))}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <IconChip icon="people" tint={colors.primary} size={64} />
      <Text style={styles.emptyTitle}>Dividí gastos con quien quieras</Text>
      <Text style={styles.emptyText}>
        Armá un grupo para un viaje, la convivencia o una salida. Cargá los gastos y Mi Platica calcula quién le debe a quién.
      </Text>
      <Pressable style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]} onPress={onCreate}>
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.emptyCtaText}>Crear mi primer grupo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
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
  limitNoteText: { ...typography.caption, color: colors.textMuted, flex: 1 },
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
  rowName: { ...typography.heading, color: colors.textPrimary },
  rowKind: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  balanceLabel: { ...typography.caption, fontWeight: "700" },
  balanceAmount: { ...typography.body, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: spacing.md },
  emptyTitle: { ...typography.title, color: colors.textPrimary, textAlign: "center", marginTop: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  emptyCtaText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
