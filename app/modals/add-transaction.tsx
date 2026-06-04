import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { categoriesByGroup, categoryById } from "../../lib/categories";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useCategorizeTransaction } from "../../lib/hooks/use-categorize-transaction";
import { useCreateTransaction } from "../../lib/hooks/use-create-transaction";
import { useTransactions, useUpdateTransaction } from "../../lib/hooks/use-transactions";
import { useRecurringStore } from "../../lib/store/recurring";
import { colors, radius, spacing } from "../../lib/theme";

type TxType = "income" | "expense" | "transfer" | "investment";

const TYPES: { value: TxType; label: string }[] = [
  { value: "expense",    label: "Gasto" },
  { value: "income",     label: "Ingreso" },
  { value: "transfer",   label: "Transferencia" },
  { value: "investment", label: "Inversión" },
];

export default function AddTransactionModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const accounts = useAccounts();
  const txs = useTransactions();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const categorize = useCategorizeTransaction();

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const addRecurring = useRecurringStore((s) => s.add);
  const prefilled = useRef(false);

  // Default a la primera cuenta activa cuando carguen (solo en alta).
  useEffect(() => {
    if (editing) return;
    if (!accountId && accounts.data && accounts.data.length > 0) {
      setAccountId(accounts.data[0].id);
    }
  }, [editing, accounts.data, accountId]);

  // Modo edición: precargar desde la cache de transacciones (una sola vez).
  useEffect(() => {
    if (!editing || prefilled.current || !txs.data || !accounts.data) return;
    const tx = txs.data.find((t) => t.id === id);
    if (!tx) return;
    setType(tx.type as TxType);
    setDescription(tx.description ?? tx.merchant ?? "");
    setAccountId(tx.account_id);
    setCategoryId(tx.category ?? null);
    const acc = accounts.data.find((a) => a.id === tx.account_id);
    const amt = acc?.currency === "USD" ? tx.amount_usd : tx.amount_ars;
    setAmount(amt != null ? String(amt) : "");
    prefilled.current = true;
  }, [editing, id, txs.data, accounts.data]);

  const selectedAccount = useMemo(
    () => accounts.data?.find((a) => a.id === accountId) ?? null,
    [accounts.data, accountId],
  );

  const availableCategories = useMemo(() => {
    if (type === "income") return categoriesByGroup("income");
    if (type === "transfer") return categoriesByGroup("transfer");
    if (type === "investment") return categoriesByGroup("investment");
    return categoriesByGroup("expense");
  }, [type]);

  async function suggestWithAI() {
    if (!description.trim() || !amount.trim() || !selectedAccount) {
      Alert.alert("Faltan datos", "Necesito descripción, monto y cuenta para sugerir categoría.");
      return;
    }
    try {
      const result = await categorize.mutateAsync({
        description: description.trim(),
        amount: Number(amount.replace(",", ".")),
        currency: selectedAccount.currency,
        account_name: selectedAccount.name,
      });
      setCategoryId(result.category);
      if (result.merchant_normalized) {
        setDescription((prev) => (prev === result.merchant_normalized ? prev : `${result.merchant_normalized}`));
      }
    } catch (e) {
      Alert.alert("Sin sugerencia", e instanceof Error ? e.message : "La IA no pudo categorizar.");
    }
  }

  async function submit() {
    if (!selectedAccount) {
      Alert.alert("Sin cuenta", "Agregá una cuenta primero (Dashboard → +).");
      return;
    }
    const amountNum = Number(amount.replace(",", "."));
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá un número mayor a cero.");
      return;
    }

    const amount_ars = selectedAccount.currency === "ARS" ? amountNum : 0;
    const amount_usd = selectedAccount.currency === "USD" ? amountNum : null;

    try {
      if (editing) {
        await update.mutateAsync({
          id: id!,
          patch: {
            account_id: selectedAccount.id,
            type,
            category: categoryId ?? null,
            amount_ars,
            amount_usd,
            description: description.trim() || null,
          },
        });
      } else {
        await create.mutateAsync({
          account_id: selectedAccount.id,
          type,
          category: categoryId ?? null,
          amount_ars,
          amount_usd,
          description: description.trim() || null,
          merchant: null,
          source: "manual",
        });
        if (repeat) {
          addRecurring({
            accountId: selectedAccount.id,
            type,
            category: categoryId ?? null,
            amountArs: amount_ars,
            amountUsd: amount_usd,
            description: description.trim() || null,
          });
        }
      }
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la transacción.");
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <FormScreen title={editing ? "Editar movimiento" : "Nuevo movimiento"}>
      <FormField label="Tipo">
        <ChipRow>
          {TYPES.map((t) => (
            <FormChip
              key={t.value}
              label={t.label}
              active={type === t.value}
              onPress={() => { setType(t.value); setCategoryId(null); }}
            />
          ))}
        </ChipRow>
      </FormField>

      <FormField label={`Monto (${selectedAccount?.currency ?? "—"})`}>
        <FormInput placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </FormField>

      <FormField label="Descripción">
        <FormInput
          placeholder='ej: "uber a casa", "carrefour"'
          value={description}
          onChangeText={setDescription}
        />
      </FormField>

      <Pressable
        style={({ pressed }) => [styles.aiBtn, pressed && { opacity: 0.85 }, categorize.isPending && { opacity: 0.5 }]}
        onPress={suggestWithAI}
        disabled={categorize.isPending}
      >
        <Ionicons name="sparkles" size={16} color={colors.primaryBright} />
        <Text style={styles.aiBtnText}>{categorize.isPending ? "Pensando…" : "Sugerir categoría con IA"}</Text>
      </Pressable>

      <FormField label="Cuenta" hint={accounts.data?.length ? undefined : "Agregá una cuenta desde el dashboard."}>
        <ChipRow>
          {accounts.data?.map((acc) => (
            <FormChip key={acc.id} label={acc.name} active={accountId === acc.id} onPress={() => setAccountId(acc.id)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField
        label="Categoría"
        hint={categoryId && categoryById(categoryId)?.label ? undefined : "Tocá una para elegir o usá ✨ IA arriba."}
      >
        <ChipRow>
          {availableCategories.map((c) => (
            <FormChip
              key={c.id}
              label={`${c.icon} ${c.label}`}
              active={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </ChipRow>
      </FormField>

      {!editing ? (
        <Pressable style={styles.repeatRow} onPress={() => setRepeat((v) => !v)}>
          <Ionicons
            name={repeat ? "checkbox" : "square-outline"}
            size={22}
            color={repeat ? colors.primaryBright : colors.textMuted}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.repeatLabel}>Repetir todos los meses</Text>
            <Text style={styles.repeatHint}>Lo vas a poder registrar de un toque cada mes.</Text>
          </View>
        </Pressable>
      ) : null}

      <SubmitButton
        label={busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar movimiento"}
        onPress={submit}
        busy={busy}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + "55",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  aiBtnText: { color: colors.primaryBright, fontWeight: "700" },
  repeatRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  repeatLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  repeatHint: { color: colors.textMuted, fontSize: 12 },
});
