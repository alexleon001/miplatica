// Alta de un gasto compartido. Quién pagó + cómo se reparte (equal/exact/shares/
// percent) entre los miembros elegidos. Las partes las calcula lib/splits.

import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { DateField } from "../../components/DateField";
import { categoriesByGroup } from "../../lib/categories";
import { useGroup } from "../../lib/hooks/use-group";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { useCreateSharedExpense } from "../../lib/hooks/use-shared-expenses";
import { useCurrencyStore } from "../../lib/store/currency";
import { buildSplits, splitsMatchTotal, type SplitType } from "../../lib/splits";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { radius, spacing } from "../../lib/theme";

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Iguales" },
  { value: "exact", label: "Montos" },
  { value: "shares", label: "Partes" },
  { value: "percent", label: "%" },
];

function parseNum(s: string): number {
  return Number((s || "").replace(",", "."));
}

export default function AddSharedExpenseModal() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useGroup(groupId);
  const create = useCreateSharedExpense();
  const rates = useExchangeRates();
  const usdType = useCurrencyStore((s) => s.usdType);

  const members = useMemo(
    () => (group.data?.members ?? []).filter((m) => m.status !== "left"),
    [group.data?.members],
  );

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  // member_id -> incluido (para equal) ; member_id -> valor crudo (exact/shares/percent)
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  // El que paga por defecto es el primer miembro activo (normalmente "Yo").
  const effectivePaidBy = paidBy || members[0]?.id || "";
  // Por defecto todos incluidos.
  const isIncluded = (id: string) => included[id] ?? true;

  const expenseCats = categoriesByGroup("expense");

  async function submit() {
    const total = parseNum(amount);
    if (!description.trim()) {
      Alert.alert("Falta la descripción", "Ponele un nombre al gasto (ej: Cena, Nafta, Alquiler).");
      return;
    }
    if (!amount.trim() || Number.isNaN(total) || total <= 0) {
      Alert.alert("Monto inválido", "Ingresá el monto del gasto (mayor a cero).");
      return;
    }
    const participants = members.filter((m) => isIncluded(m.id));
    if (participants.length === 0) {
      Alert.alert("Sin participantes", "Elegí al menos un miembro entre quienes se reparte el gasto.");
      return;
    }

    let splits;
    if (splitType === "equal") {
      splits = buildSplits("equal", total, { memberIds: participants.map((m) => m.id) });
    } else if (splitType === "exact") {
      const amounts: Record<string, number> = {};
      for (const m of participants) amounts[m.id] = parseNum(values[m.id]) || 0;
      splits = buildSplits("exact", total, { amounts });
      if (!splitsMatchTotal(total, splits)) {
        Alert.alert("No cierra", "Los montos por persona tienen que sumar el total del gasto.");
        return;
      }
    } else {
      const weights: Record<string, number> = {};
      for (const m of participants) weights[m.id] = parseNum(values[m.id]) || 0;
      if (Object.values(weights).every((w) => w <= 0)) {
        Alert.alert("Faltan valores", splitType === "percent" ? "Ingresá los porcentajes." : "Ingresá las partes de cada uno.");
        return;
      }
      splits = buildSplits(splitType, total, { weights });
    }

    const rate = rates.data ? Number(rates.data[usdType]) : null;
    const amountUsd = rate && rate > 0 ? Math.round((total / rate) * 100) / 100 : null;

    try {
      await create.mutateAsync({
        groupId: groupId!,
        paidBy: effectivePaidBy,
        amountArs: total,
        amountUsd,
        usdRateUsed: rate,
        description,
        category,
        date,
        splitType,
        splits: splits.map((s) => ({ member_id: s.member_id, amount: s.amount, share: s.share })),
      });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el gasto.");
    }
  }

  return (
    <FormScreen title="Nuevo gasto">
      <FormField label="Descripción">
        <FormInput placeholder="Cena, Nafta, Alquiler…" value={description} onChangeText={setDescription} autoFocus />
      </FormField>

      <FormField label="Monto (ARS)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </FormField>

      <FormField label="Pagó">
        <ChipRow>
          {members.map((m) => (
            <FormChip key={m.id} label={m.display_name} active={effectivePaidBy === m.id} onPress={() => setPaidBy(m.id)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Cómo se reparte">
        <ChipRow>
          {SPLIT_TYPES.map((s) => (
            <FormChip key={s.value} label={s.label} active={splitType === s.value} onPress={() => setSplitType(s.value)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField
        label="Entre quiénes"
        hint={
          splitType === "equal"
            ? "Se reparte en partes iguales entre los marcados."
            : splitType === "exact"
              ? "Ingresá cuánto pone cada uno (debe sumar el total)."
              : splitType === "percent"
                ? "Ingresá el porcentaje de cada uno."
                : "Ingresá las partes de cada uno (ej: 1, 2, 1)."
        }
      >
        <View style={{ gap: spacing.sm }}>
          {members.map((m) => (
            <View key={m.id} style={styles.splitRow}>
              <Switch
                value={isIncluded(m.id)}
                onValueChange={(v) => setIncluded((prev) => ({ ...prev, [m.id]: v }))}
                trackColor={{ true: theme.accent, false: theme.surface2 }}
                thumbColor="#FFFFFF"
              />
              <Text style={styles.splitName}>{m.display_name}</Text>
              {splitType !== "equal" && isIncluded(m.id) ? (
                <FormInput
                  style={styles.splitInput}
                  placeholder={splitType === "percent" ? "%" : splitType === "exact" ? "$" : "parte"}
                  keyboardType="decimal-pad"
                  value={values[m.id] ?? ""}
                  onChangeText={(t) => setValues((prev) => ({ ...prev, [m.id]: t }))}
                />
              ) : null}
            </View>
          ))}
        </View>
      </FormField>

      <FormField label="Categoría (opcional)">
        <ChipRow>
          {expenseCats.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.catChip, category === cat.id && styles.catChipActive]}
              onPress={() => setCategory(category === cat.id ? null : cat.id)}
            >
              <Text style={[styles.catText, category === cat.id && styles.catTextActive]}>{cat.icon} {cat.label}</Text>
            </Pressable>
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Fecha">
        <DateField value={date} onChange={setDate} placeholder="Elegí la fecha" />
      </FormField>

      <SubmitButton label={create.isPending ? "Guardando…" : "Guardar gasto"} onPress={submit} busy={create.isPending} />
    </FormScreen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    splitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    splitName: { fontSize: 15, color: c.text, flex: 1 },
    splitInput: {
      width: 90,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 16,
    },
    catChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
    },
    catChipActive: { backgroundColor: c.accent, borderColor: c.accent },
    catText: { color: c.textDim, fontWeight: "600", fontSize: 13 },
    catTextActive: { color: c.accentContrast },
  });
}
