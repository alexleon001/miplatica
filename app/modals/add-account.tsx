import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { useAccounts, useUpdateAccount } from "../../lib/hooks/use-accounts";
import { supabase } from "../../lib/supabase";
import { colors } from "../../lib/colors";

type AccountType = "wallet" | "bank" | "broker" | "cash" | "crypto";
type AccountCurrency = "ARS" | "USD" | "USDT" | "BTC" | "EUR";

const TYPES: { value: AccountType; label: string }[] = [
  { value: "wallet", label: "Billetera" },
  { value: "bank", label: "Banco" },
  { value: "broker", label: "Broker" },
  { value: "cash", label: "Efectivo" },
  { value: "crypto", label: "Cripto" },
];

const CURRENCIES: AccountCurrency[] = ["ARS", "USD", "USDT", "BTC", "EUR"];

export default function AddAccountModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const accounts = useAccounts();
  const update = useUpdateAccount();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("wallet");
  const [currency, setCurrency] = useState<AccountCurrency>("ARS");
  const [balance, setBalance] = useState("");
  const [busy, setBusy] = useState(false);

  // Modo edición: precargar desde la cache de cuentas.
  useEffect(() => {
    if (!editing) return;
    const acc = accounts.data?.find((a) => a.id === id);
    if (acc) {
      setName(acc.name);
      setType(acc.type as AccountType);
      setCurrency(acc.currency as AccountCurrency);
      setBalance(String(acc.balance_amount));
    }
  }, [editing, id, accounts.data]);

  async function submit() {
    if (!session?.user.id) {
      Alert.alert("Sesión expirada", "Volvé a iniciar sesión.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre a la cuenta (ej: Mercado Pago).");
      return;
    }

    const balanceNum = balance.trim() === "" ? 0 : Number(balance.replace(",", "."));
    if (Number.isNaN(balanceNum)) {
      Alert.alert("Saldo inválido", "Usá solo números (ej: 12000 o 12000,50).");
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await update.mutateAsync({
          id: id!,
          patch: {
            name: name.trim(),
            type,
            currency,
            balance_amount: balanceNum,
            balance_updated_at: new Date().toISOString(),
          },
        });
      } else {
        const { error } = await supabase.from("accounts").insert({
          owner_id: session.user.id,
          name: name.trim(),
          type,
          currency,
          balance_amount: balanceNum,
          balance_updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["accounts"] });
        await queryClient.invalidateQueries({ queryKey: ["net_worth"] });
      }
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? "Editar cuenta" : "Nueva cuenta" }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <Field label="Nombre">
            <TextInput
              style={styles.input}
              placeholder="Mercado Pago, Galicia, Cocos…"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Field label="Tipo">
            <View style={styles.row}>
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[styles.chip, type === t.value && styles.chipActive]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Moneda">
            <View style={styles.row}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, currency === c && styles.chipActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Saldo inicial (opcional)">
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={balance}
              onChangeText={setBalance}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, busy && { opacity: 0.5 }]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.submitText}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar cuenta"}</Text>
          </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 18 },
  field: { gap: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.textPrimary },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
