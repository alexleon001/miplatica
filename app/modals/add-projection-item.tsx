import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MonthField } from "../../components/MonthField";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import {
  useCreateProjectionItem,
  useProjectionItems,
  useUpdateProjectionItem,
} from "../../lib/hooks/use-projection";
import { addMonths, frenchPayment, monthKey, monthLabel } from "../../lib/projection";
import { colors, radius, spacing, typography } from "../../lib/theme";

type Recurrence = "monthly" | "installments" | "once";
type Currency = "ARS" | "USD";

// Orden pensado para que "Solo ese mes" (el default) sea lo primero y lo más
// intuitivo: cargar un gasto puntual no debería repetirse en todos los meses.
const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "once", label: "Solo ese mes" },
  { value: "monthly", label: "Todos los meses" },
  { value: "installments", label: "En cuotas" },
];

const METHOD_SUGGESTIONS = ["TDC VISA", "TDC MASTER", "Mercado Pago", "Débito", "Efectivo", "Otros"];
const CURRENCIES: Currency[] = ["ARS", "USD"];

function parseNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function currentMonthInput(): string {
  return new Date().toISOString().slice(0, 7); // AAAA-MM
}

export default function AddProjectionItemModal() {
  const router = useRouter();
  const create = useCreateProjectionItem();
  const update = useUpdateProjectionItem();
  const { id, dup } = useLocalSearchParams<{ id?: string; dup?: string }>();
  const editing = !!id;
  // `dup` = duplicar: prefilla desde ese ítem pero crea uno NUEVO (no edita).
  const sourceId = id ?? dup;
  const items = useProjectionItems();

  const [name, setName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Otros");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [recurrence, setRecurrence] = useState<Recurrence>("once");
  const [installments, setInstallments] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonthInput());

  useEffect(() => {
    if (!sourceId) return;
    const it = items.data?.find((x) => x.id === sourceId);
    if (it) {
      setName(dup ? `${it.name} (copia)` : it.name);
      setPaymentMethod(it.payment_method);
      // Cuotas sin interés: en DB guardamos el monto POR cuota, pero al usuario le
      // mostramos el TOTAL de la compra → reconstruimos total = por-cuota × cuotas.
      // (Con interés, `amount` ya es el capital total y se muestra tal cual.)
      const isInstallNoInterest =
        it.recurrence === "installments" && it.interest_rate == null && it.installments_total != null;
      setAmount(
        isInstallNoInterest ? String(it.amount * (it.installments_total ?? 1)) : String(it.amount),
      );
      setCurrency(it.currency === "USD" ? "USD" : "ARS");
      setRecurrence(it.recurrence as Recurrence);
      setInstallments(it.installments_total != null ? String(it.installments_total) : "");
      setInterestRate(it.interest_rate != null ? String(it.interest_rate) : "");
      setStartMonth(it.start_month.slice(0, 7));
    }
  }, [sourceId, dup, items.data]);

  // Con interés cargado, el "monto" es el capital a financiar y mostramos la
  // cuota fija (sistema francés) calculada en vivo.
  const hasInterest = recurrence === "installments" && interestRate.trim() !== "";
  const cuotaPreview = useMemo(() => {
    if (!hasInterest) return null;
    const capital = parseNum(amount);
    const n = Math.round(parseNum(installments));
    const rate = parseNum(interestRate);
    if (!Number.isFinite(capital) || capital <= 0 || !Number.isFinite(n) || n <= 0 || !Number.isFinite(rate) || rate < 0) {
      return null;
    }
    const cuota = frenchPayment(capital, rate, n);
    return { cuota, total: cuota * n, interes: cuota * n - capital };
  }, [hasInterest, amount, installments, interestRate]);

  // Cuotas SIN interés: el usuario carga el total de la compra y N cuotas; la app
  // reparte total / N. Mostramos el valor de cada cuota en vivo.
  const cuotaSinInteres = useMemo(() => {
    if (recurrence !== "installments" || hasInterest) return null;
    const total = parseNum(amount);
    const n = Math.round(parseNum(installments));
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(n) || n <= 0) return null;
    return total / n;
  }, [recurrence, hasInterest, amount, installments]);

  // Preview en vivo del alcance: en qué meses cae el gasto. Resuelve la confusión
  // del default "todos los meses" (antes, un gasto puntual se repetía a futuro).
  const spanPreview = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(startMonth.trim())) return null;
    const start = monthKey(`${startMonth.trim()}-01`);
    if (recurrence === "once") return `Aparece solo en ${monthLabel(start)}.`;
    if (recurrence === "monthly") return `Se repite todos los meses desde ${monthLabel(start)}.`;
    const n = Math.round(parseNum(installments));
    if (!Number.isFinite(n) || n <= 0) return `Arranca en ${monthLabel(start)}. Elegí cuántas cuotas.`;
    return `${n} ${n === 1 ? "cuota" : "cuotas"}: ${monthLabel(start)} → ${monthLabel(addMonths(start, n - 1))}.`;
  }, [recurrence, startMonth, installments]);

  const amountLabel = hasInterest
    ? `Total a financiar / capital (${currency})`
    : recurrence === "installments"
      ? `Total de la compra (${currency})`
      : recurrence === "monthly"
        ? `Monto por mes (${currency})`
        : `Monto (${currency})`;

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre (ej: Alquiler, Concierto, Internet).");
      return;
    }
    const amountNum = parseNum(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(
        "Monto inválido",
        recurrence === "installments"
          ? "Ingresá el total de la compra (mayor a cero)."
          : "Ingresá el monto del gasto (mayor a cero).",
      );
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(startMonth.trim())) {
      Alert.alert("Mes inválido", "Elegí el mes de inicio.");
      return;
    }
    let installmentsTotal: number | null = null;
    let interest: number | null = null;
    // Monto que se guarda en DB. Para cuotas SIN interés, `amount` (lo que tipeó el
    // usuario) es el TOTAL de la compra → guardamos el valor POR cuota (total / N),
    // que es lo que la grilla de proyección espera. Con interés, `amount` es el
    // capital y se guarda tal cual (la cuota se calcula con sistema francés).
    let amountToStore = amountNum;
    if (recurrence === "installments") {
      installmentsTotal = Math.round(parseNum(installments));
      if (!installments.trim() || Number.isNaN(installmentsTotal) || installmentsTotal <= 0) {
        Alert.alert("Cuotas inválidas", "Ingresá cuántas cuotas son (ej: 6).");
        return;
      }
      if (interestRate.trim()) {
        interest = parseNum(interestRate);
        if (Number.isNaN(interest) || interest < 0) {
          Alert.alert("Interés inválido", "La tasa anual (TNA %) tiene que ser un número válido.");
          return;
        }
      } else {
        amountToStore = amountNum / installmentsTotal;
      }
    }

    const payload = {
      name: name.trim(),
      payment_method: paymentMethod.trim() || "Otros",
      amount: amountToStore,
      currency,
      recurrence,
      installments_total: installmentsTotal,
      interest_rate: interest,
      start_month: monthKey(`${startMonth.trim()}-01`),
    };

    try {
      if (editing) await update.mutateAsync({ id: id!, patch: payload });
      else await create.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el gasto.");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <FormScreen title={editing ? "Editar gasto" : dup ? "Duplicar gasto" : "Nuevo gasto proyectado"}>
      <FormField label="Nombre">
        <FormInput placeholder="Alquiler, Concierto, Internet…" value={name} onChangeText={setName} />
      </FormField>

      <FormField label="Medio de pago / grupo">
        <FormInput placeholder="TDC VISA, Mercado Pago…" value={paymentMethod} onChangeText={setPaymentMethod} />
        <ChipRow>
          {METHOD_SUGGESTIONS.map((m) => (
            <Pressable key={m} style={styles.suggestChip} onPress={() => setPaymentMethod(m)}>
              <Text style={styles.suggestText}>{m}</Text>
            </Pressable>
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

      <FormField label={amountLabel}>
        <FormInput placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </FormField>

      <FormField label="¿Cada cuánto?">
        <ChipRow>
          {RECURRENCES.map((r) => (
            <FormChip key={r.value} label={r.label} active={recurrence === r.value} onPress={() => setRecurrence(r.value)} />
          ))}
        </ChipRow>
        {spanPreview ? (
          <View style={styles.spanCallout}>
            <Ionicons name="calendar-outline" size={14} color={colors.primaryBright} />
            <Text style={styles.spanText}>{spanPreview}</Text>
          </View>
        ) : null}
      </FormField>

      {recurrence === "installments" && (
        <>
          <FormField label="Cantidad de cuotas">
            <FormInput placeholder="ej: 6" keyboardType="number-pad" value={installments} onChangeText={setInstallments} />
            {cuotaSinInteres != null ? (
              <Text style={styles.preview}>
                {Math.round(parseNum(installments))} cuotas de{" "}
                {Math.round(cuotaSinInteres).toLocaleString("es-AR")} {currency} c/u
              </Text>
            ) : null}
          </FormField>

          <FormField
            label="Interés TNA % anual (opcional)"
            hint={
              hasInterest && !cuotaPreview
                ? "Con interés, el monto de arriba es el capital total; la cuota se calcula sola."
                : undefined
            }
          >
            <FormInput
              placeholder="ej: 60 — dejalo vacío si ya sabés la cuota"
              keyboardType="decimal-pad"
              value={interestRate}
              onChangeText={setInterestRate}
            />
            {hasInterest && cuotaPreview ? (
              <Text style={styles.preview}>
                Cuota: {Math.round(cuotaPreview.cuota).toLocaleString("es-AR")} {currency}/mes
                {"  ·  "}Total: {Math.round(cuotaPreview.total).toLocaleString("es-AR")}
                {"  ·  "}Interés: {Math.round(cuotaPreview.interes).toLocaleString("es-AR")}
              </Text>
            ) : null}
          </FormField>
        </>
      )}

      <FormField label="Mes de inicio">
        <MonthField value={startMonth} onChange={setStartMonth} placeholder="Elegí el mes de inicio" />
      </FormField>

      <SubmitButton
        label={pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar gasto"}
        onPress={submit}
        busy={pending}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  suggestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + "55",
  },
  suggestText: { color: colors.primaryBright, fontSize: 12, fontWeight: "600" },
  preview: { ...typography.caption, color: colors.positive, fontWeight: "700", marginTop: spacing.xs },
  spanCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  spanText: { ...typography.caption, color: colors.primaryBright, fontWeight: "600", flex: 1 },
});
