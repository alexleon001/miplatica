// Mis cuentas — rediseño "Línea": label MIS CUENTAS + filas (caja de icono con
// borde fino + nombre/subtítulo + saldo) separadas por hairline. useTheme().

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAccounts, useDeleteAccount } from "../lib/hooks/use-accounts";
import { confirmDelete } from "../lib/confirm";
import { countryConfig } from "../lib/countries";
import { useCurrencyStore } from "../lib/store/currency";
import { useTheme } from "../lib/theme-context";
import { MoneyAmount } from "./MoneyAmount";
import { RowsSkeleton } from "./Skeleton";

type IoniconName = keyof typeof Ionicons.glyphMap;

const TYPE_META: Record<string, { label: string; icon: IoniconName }> = {
  wallet: { label: "Billetera", icon: "phone-portrait-outline" },
  bank: { label: "Banco", icon: "business-outline" },
  broker: { label: "Broker", icon: "trending-up-outline" },
  cash: { label: "Efectivo", icon: "cash-outline" },
  crypto: { label: "Cripto", icon: "logo-bitcoin" },
};

export function AccountsList() {
  const c = useTheme();
  const { data: accounts, isLoading } = useAccounts();
  const router = useRouter();
  const del = useDeleteAccount();
  const country = useCurrencyStore((s) => s.country);
  // El slot local "ARS" se rotula según el país (Bs. en VE).
  const localLabel = countryConfig(country).currencyLabel;

  return (
    <View style={{ gap: 14, paddingTop: 4 }}>
      <Text style={[styles.label, { color: c.textDim }]}>Mis cuentas</Text>

      {isLoading ? (
        <RowsSkeleton count={2} />
      ) : !accounts || accounts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={26} color={c.textFaint} />
          <Text style={[styles.muted, { color: c.textDim }]}>Todavía no agregaste cuentas. Empezá con la primera.</Text>
        </View>
      ) : (
        accounts.map((acc, i) => {
          const meta = TYPE_META[acc.type] ?? { label: acc.type, icon: "ellipse-outline" as IoniconName };
          return (
            <Pressable
              key={acc.id}
              onPress={() => router.push({ pathname: "/modals/add-account", params: { id: acc.id } })}
              onLongPress={() => confirmDelete(acc.name, () => del.mutate(acc.id))}
              style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 14 }, pressed && { opacity: 0.6 }]}
            >
              <View style={[styles.iconBox, { borderColor: c.border }]}>
                <Ionicons name={meta.icon} size={16} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountName, { color: c.text }]}>{acc.name}</Text>
                <Text style={[styles.accountType, { color: c.textDim }]}>
                  {meta.label} · {acc.currency === "ARS" ? localLabel : acc.currency}
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
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.6 }]}
        onPress={() => router.push("/modals/add-account")}
      >
        <Ionicons name="add" size={17} color={c.accent} />
        <Text style={[styles.ctaText, { color: c.accent }]}>Agregar cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 12 },
  muted: { fontSize: 13, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  accountName: { fontSize: 14, fontWeight: "600" },
  accountType: { fontSize: 11, marginTop: 1 },
  cta: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 6 },
  ctaText: { fontWeight: "600", fontSize: 14 },
});
