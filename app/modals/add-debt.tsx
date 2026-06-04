import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { DateField } from "../../components/DateField";
import { useCreateDebt, useDebts, useUpdateDebt } from "../../lib/hooks/use-debts";

type DebtType = "credit_card" | "loan" | "informal" | "cuotas";
type DebtCurrency = "ARS" | "USD";

const TYPES: { value: DebtType; label: string }[] = [
  { value: "credit_card", label: "Tarjeta" },
  { value: "loan", label: "Préstamo" },
  { value: "cuotas", label: "Cuotas" },
  { value: "informal", label: "Informal" },
];

const CURRENCIES: DebtCurrency[] = ["ARS", "USD"];

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

export default function AddDebtModal() {
  const router = useRouter();
  const create = useCreateDebt();
  const update = useUpdateDebt();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const debts = useDebts();

  const [name, setName] = useState("");
  const [type, setType] = useState<DebtType>("credit_card");
  const [currency, setCurrency] = useState<DebtCurrency>("ARS");
  const [total, setTotal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [nextPayment, setNextPayment] = useState("");

  useEffect(() => {
    if (!editing) return;
    const d = debts.data?.find((x) => x.id === id);
    if (d) {
      setName(d.name);
      setType(d.type as DebtType);
      setCurrency(d.currency as DebtCurrency);
      setTotal(String(d.total_amount));
      setRemaining(String(d.remaining_amount));
      setInterestRate(d.interest_rate != null ? String(d.interest_rate) : "");
      setMonthlyPayment(d.monthly_payment != null ? String(d.monthly_payment) : "");
      setNextPayment(d.next_payment_date ?? "");
    }
  }, [editing, id, debts.data]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre (ej: Visa Galicia, Préstamo auto).");
      return;
    }
    const totalNum = parseNum(total);
    if (!total.trim() || Number.isNaN(totalNum) || totalNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá el total de la deuda (mayor a cero).");
      return;
    }
    const remainingNum = remaining.trim() ? parseNum(remaining) : totalNum;
    if (Number.isNaN(remainingNum) || remainingNum < 0) {
      Alert.alert("Saldo inválido", "El saldo restante tiene que ser un número válido.");
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      currency,
      total_amount: totalNum,
      remaining_amount: remainingNum,
      interest_rate: interestRate.trim() ? parseNum(interestRate) : null,
      monthly_payment: monthlyPayment.trim() ? parseNum(monthlyPayment) : null,
      next_payment_date: nextPayment.trim() ? nextPayment.trim() : null,
    };

    try {
      if (editing) await update.mutateAsync({ id: id!, patch: payload });
      else await create.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la deuda.");
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <FormScreen title={editing ? "Editar deuda" : "Nueva deuda"}>
      <FormField label="Nombre">
        <FormInput placeholder="Visa Galicia, Préstamo auto…" value={name} onChangeText={setName} />
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
            <FormChip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label={`Total de la deuda (${currency})`}>
        <FormInput placeholder="0" keyboardType="decimal-pad" value={total} onChangeText={setTotal} />
      </FormField>

      <FormField label="Saldo restante (opcional, default = total)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={remaining} onChangeText={setRemaining} />
      </FormField>

      <FormField label="Tasa anual % (opcional)">
        <FormInput placeholder="ej: 120" keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} />
      </FormField>

      <FormField label="Cuota mensual (opcional)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={monthlyPayment} onChangeText={setMonthlyPayment} />
      </FormField>

      <FormField label="Próximo vencimiento (opcional)">
        <DateField value={nextPayment} onChange={setNextPayment} placeholder="Elegí la fecha de vencimiento" />
      </FormField>

      <SubmitButton
        label={busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar deuda"}
        onPress={submit}
        busy={busy}
      />
    </FormScreen>
  );
}
