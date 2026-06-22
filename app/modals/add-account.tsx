import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { useAuth } from "../../lib/auth";
import { useAccounts, useUpdateAccount } from "../../lib/hooks/use-accounts";
import { countryConfig } from "../../lib/countries";
import { useCurrencyStore } from "../../lib/store/currency";
import { supabase } from "../../lib/supabase";

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
  const country = useCurrencyStore((s) => s.country);
  // En VE la moneda local (slot "ARS") se rotula "Bs."; el resto va literal.
  const currencyLabel = (c: AccountCurrency): string =>
    c === "ARS" ? countryConfig(country).currencyLabel : c;

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("wallet");
  const [currency, setCurrency] = useState<AccountCurrency>("ARS");
  const [balance, setBalance] = useState("");
  const [busy, setBusy] = useState(false);

  // Cuenta de Mercado Pago (API): su saldo se carga a mano (MP no expone el saldo
  // de billetera por OAuth). Mostramos un hint en ese caso.
  const editingAccount = editing ? accounts.data?.find((a) => a.id === id) : undefined;
  const isMpAccount =
    editingAccount?.integration_type === "api" || /mercado\s*pago/i.test(editingAccount?.name ?? "");

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
    <FormScreen title={editing ? "Editar cuenta" : "Nueva cuenta"}>
      <FormField label="Nombre">
        <FormInput placeholder="Mercado Pago, Galicia, Cocos…" value={name} onChangeText={setName} />
      </FormField>

      <FormField label="Tipo">
        <ChipRow>
          {TYPES.map((t) => (
            <FormChip key={t.value} label={t.label} active={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Moneda">
        <ChipRow>
          {CURRENCIES.map((c) => (
            <FormChip key={c} label={currencyLabel(c)} active={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField
        label="Saldo inicial (opcional)"
        hint={
          isMpAccount
            ? "El saldo de Mercado Pago no se puede leer por la API (MP no lo permite para cuentas personales). Actualizalo a mano acá; los pagos recibidos se sincronizan solos."
            : undefined
        }
      >
        <FormInput placeholder="0" keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
      </FormField>

      <SubmitButton
        label={busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar cuenta"}
        onPress={submit}
        busy={busy}
      />
    </FormScreen>
  );
}
