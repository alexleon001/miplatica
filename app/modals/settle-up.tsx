// Saldar una deuda del grupo. Por defecto NO toca tus finanzas personales (ledger
// separado). Opción "registrar como movimiento": crea una transacción real en una
// cuenta tuya (gasto si pagaste, ingreso si te pagaron).

import { useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { DateField } from "../../components/DateField";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useAuth } from "../../lib/auth";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { useGroup } from "../../lib/hooks/use-group";
import { useSettle } from "../../lib/hooks/use-settlements";
import { useCurrencyStore } from "../../lib/store/currency";
import { colors, spacing, typography } from "../../lib/theme";

function parseNum(s: string): number {
  return Number((s || "").replace(",", "."));
}

export default function SettleUpModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; from?: string; to?: string; amount?: string }>();
  const group = useGroup(params.groupId);
  const settle = useSettle();
  const accounts = useAccounts();
  const { session } = useAuth();
  const rates = useExchangeRates();
  const usdType = useCurrencyStore((s) => s.usdType);

  const members = useMemo(
    () => (group.data?.members ?? []).filter((m) => m.status !== "left"),
    [group.data?.members],
  );
  const myMemberId = members.find((m) => m.user_id === session?.user.id)?.id;

  const [from, setFrom] = useState<string>(params.from ?? "");
  const [to, setTo] = useState<string>(params.to ?? "");
  const [amount, setAmount] = useState<string>(params.amount ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [record, setRecord] = useState(false);
  const [accountId, setAccountId] = useState<string>("");

  const effFrom = from || members[0]?.id || "";
  const effTo = to || members.find((m) => m.id !== effFrom)?.id || "";

  async function submit() {
    const total = parseNum(amount);
    if (effFrom === effTo) {
      Alert.alert("Elegí dos personas", "Quien paga y quien recibe tienen que ser distintos.");
      return;
    }
    if (!amount.trim() || Number.isNaN(total) || total <= 0) {
      Alert.alert("Monto inválido", "Ingresá cuánto se saldó (mayor a cero).");
      return;
    }
    if (record && !accountId && !accounts.data?.[0]) {
      Alert.alert("Sin cuenta", "No tenés cuentas para registrar el movimiento.");
      return;
    }

    const rate = rates.data ? Number(rates.data[usdType]) : null;
    const amountUsd = rate && rate > 0 ? Math.round((total / rate) * 100) / 100 : null;

    // El movimiento se registra desde la perspectiva del usuario actual.
    const accId = accountId || accounts.data?.[0]?.id || "";
    const recordPayload = record && accId
      ? { accountId: accId, type: (myMemberId === effTo ? "income" : "expense") as "income" | "expense" }
      : null;

    try {
      await settle.mutateAsync({
        groupId: params.groupId!,
        fromMember: effFrom,
        toMember: effTo,
        amountArs: total,
        amountUsd,
        usdRateUsed: rate,
        date,
        note,
        record: recordPayload,
      });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude registrar el pago.");
    }
  }

  return (
    <FormScreen title="Saldar deuda">
      <FormField label="Quién paga">
        <ChipRow>
          {members.map((m) => (
            <FormChip key={m.id} label={m.display_name} active={effFrom === m.id} onPress={() => setFrom(m.id)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Quién recibe">
        <ChipRow>
          {members.map((m) => (
            <FormChip key={m.id} label={m.display_name} active={effTo === m.id} onPress={() => setTo(m.id)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Monto (ARS)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </FormField>

      <FormField label="Fecha">
        <DateField value={date} onChange={setDate} placeholder="Elegí la fecha" />
      </FormField>

      <FormField label="Nota (opcional)">
        <FormInput placeholder="Transferencia, efectivo…" value={note} onChangeText={setNote} />
      </FormField>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>Registrar como movimiento</Text>
          <Text style={styles.toggleHint}>Lo suma a tus cuentas y patrimonio</Text>
        </View>
        <Switch
          value={record}
          onValueChange={setRecord}
          trackColor={{ true: colors.primary, false: colors.surfaceSunken }}
          thumbColor="#FFFFFF"
        />
      </View>

      {record ? (
        <FormField label="Cuenta">
          <ChipRow>
            {(accounts.data ?? []).map((a) => (
              <FormChip
                key={a.id}
                label={a.name}
                active={(accountId || accounts.data?.[0]?.id) === a.id}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </ChipRow>
        </FormField>
      ) : null}

      <SubmitButton label={settle.isPending ? "Guardando…" : "Saldar"} onPress={submit} busy={settle.isPending} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  toggleLabel: { ...typography.body, color: colors.textPrimary },
  toggleHint: { ...typography.caption, color: colors.textMuted },
});
