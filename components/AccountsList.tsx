import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAccounts, useDeleteAccount } from "../lib/hooks/use-accounts";
import { confirmDelete } from "../lib/confirm";
import { MoneyAmount } from "./MoneyAmount";
import { RowsSkeleton } from "./Skeleton";
import { colors } from "../lib/colors";

const TYPE_LABELS: Record<string, string> = {
  wallet: "Billetera",
  bank: "Banco",
  broker: "Broker",
  cash: "Efectivo",
  crypto: "Cripto",
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
        <Text style={styles.muted}>
          Todavía no agregaste cuentas. Empezá con la primera.
        </Text>
      ) : (
        accounts.map((acc) => (
          <Pressable
            key={acc.id}
            onPress={() => router.push({ pathname: "/modals/add-account", params: { id: acc.id } })}
            onLongPress={() => confirmDelete(acc.name, () => del.mutate(acc.id))}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{acc.name}</Text>
              <Text style={styles.accountType}>
                {TYPE_LABELS[acc.type] ?? acc.type} · {acc.currency}
              </Text>
            </View>
            {acc.currency === "ARS" ? (
              <MoneyAmount ars={acc.balance_amount} usd={null} size="sm" />
            ) : (
              <MoneyAmount ars={null} usd={acc.balance_amount} size="sm" />
            )}
          </Pressable>
        ))
      )}

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/modals/add-account")}
      >
        <Text style={styles.ctaText}>+ Agregar cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  muted: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  accountType: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cta: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  ctaText: { color: colors.primary, fontWeight: "600" },
});
