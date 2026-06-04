import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAccounts, useDeleteAccount } from "../lib/hooks/use-accounts";
import { confirmDelete } from "../lib/confirm";
import { MoneyAmount } from "./MoneyAmount";
import { RowsSkeleton } from "./Skeleton";
import { colors, radius, spacing, typography, shadow } from "../lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

const TYPE_META: Record<string, { label: string; icon: IoniconName; tint: string }> = {
  wallet: { label: "Billetera", icon: "phone-portrait-outline", tint: colors.accent },
  bank: { label: "Banco", icon: "business-outline", tint: colors.ars },
  broker: { label: "Broker", icon: "trending-up-outline", tint: colors.usd },
  cash: { label: "Efectivo", icon: "cash-outline", tint: colors.positive },
  crypto: { label: "Cripto", icon: "logo-bitcoin", tint: colors.warning },
};

export function AccountsList() {
  const { data: accounts, isLoading } = useAccounts();
  const router = useRouter();
  const del = useDeleteAccount();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Mis cuentas</Text>

      {isLoading ? (
        <RowsSkeleton count={2} />
      ) : !accounts || accounts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={28} color={colors.textMuted} />
          <Text style={styles.muted}>Todavía no agregaste cuentas. Empezá con la primera.</Text>
        </View>
      ) : (
        accounts.map((acc, i) => {
          const meta = TYPE_META[acc.type] ?? { label: acc.type, icon: "ellipse-outline" as IoniconName, tint: colors.textMuted };
          return (
            <Pressable
              key={acc.id}
              onPress={() => router.push({ pathname: "/modals/add-account", params: { id: acc.id } })}
              onLongPress={() => confirmDelete(acc.name, () => del.mutate(acc.id))}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && { opacity: 0.6 }]}
            >
              <View style={[styles.iconChip, { backgroundColor: meta.tint + "22" }]}>
                <Ionicons name={meta.icon} size={18} color={meta.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{acc.name}</Text>
                <Text style={styles.accountType}>
                  {meta.label} · {acc.currency}
                </Text>
              </View>
              {acc.currency === "ARS" ? (
                <MoneyAmount ars={acc.balance_amount} usd={null} size="sm" />
              ) : (
                <MoneyAmount ars={null} usd={acc.balance_amount} size="sm" />
              )}
            </Pressable>
          );
        })
      )}

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/modals/add-account")}
      >
        <Ionicons name="add" size={18} color={colors.primaryBright} />
        <Text style={styles.ctaText}>Agregar cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  sectionLabel: { ...typography.overline, color: colors.textMuted },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  muted: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: spacing.md },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  accountName: { ...typography.bodyStrong, color: colors.textPrimary },
  accountType: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  ctaText: { color: colors.primaryBright, fontWeight: "700", fontSize: 14 },
});
