import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, form, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { DateField } from "../../components/DateField";
import { useCreateGoal, useSavingsGoals, useUpdateGoal } from "../../lib/hooks/use-savings-goals";

type GoalCurrency = "ARS" | "USD";
const CURRENCIES: GoalCurrency[] = ["ARS", "USD"];

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

export default function AddGoalModal() {
  const router = useRouter();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const goals = useSavingsGoals();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<GoalCurrency>("ARS");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!editing) return;
    const g = goals.data?.find((x) => x.id === id);
    if (g) {
      setName(g.name);
      setCurrency(g.target_currency as GoalCurrency);
      setTarget(String(g.target_amount));
      setCurrent(String(g.current_amount));
      setMonthly(g.monthly_contribution != null ? String(g.monthly_contribution) : "");
      setTargetDate(g.target_date ?? "");
      setNotes(g.notes ?? "");
    }
  }, [editing, id, goals.data]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre a la meta (ej: Auto, Vacaciones).");
      return;
    }
    const targetNum = parseNum(target);
    if (!target.trim() || Number.isNaN(targetNum) || targetNum <= 0) {
      Alert.alert("Objetivo inválido", "Ingresá el monto objetivo (mayor a cero).");
      return;
    }
    const currentNum = current.trim() ? parseNum(current) : 0;
    if (Number.isNaN(currentNum) || currentNum < 0) {
      Alert.alert("Ahorro inválido", "Lo ahorrado tiene que ser un número válido.");
      return;
    }

    const payload = {
      name: name.trim(),
      target_currency: currency,
      target_amount: targetNum,
      current_amount: currentNum,
      monthly_contribution: monthly.trim() ? parseNum(monthly) : null,
      target_date: targetDate.trim() ? targetDate.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      if (editing) await update.mutateAsync({ id: id!, patch: payload });
      else await create.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la meta.");
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <FormScreen title={editing ? "Editar meta" : "Nueva meta de ahorro"}>
      <FormField label="Nombre">
        <FormInput placeholder="Auto, Vacaciones, Fondo de emergencia…" value={name} onChangeText={setName} />
      </FormField>

      <FormField label="Moneda">
        <ChipRow>
          {CURRENCIES.map((c) => (
            <FormChip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label={`Objetivo (${currency})`}>
        <FormInput placeholder="0" keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
      </FormField>

      <FormField label="Ya ahorrado (opcional)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={current} onChangeText={setCurrent} />
      </FormField>

      <FormField label="Aporte mensual (opcional)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={monthly} onChangeText={setMonthly} />
      </FormField>

      <FormField label="Fecha objetivo (opcional)">
        <DateField value={targetDate} onChange={setTargetDate} placeholder="Elegí la fecha objetivo" />
      </FormField>

      <FormField label="Notas (opcional)">
        <FormInput
          style={form.multiline}
          placeholder="ej: para el viaje a Bariloche"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </FormField>

      <SubmitButton
        label={busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar meta"}
        onPress={submit}
        busy={busy}
      />
    </FormScreen>
  );
}
