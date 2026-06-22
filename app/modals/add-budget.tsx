import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { useCategoriesByGroup } from "../../lib/hooks/use-categories";
import { useCreateBudget } from "../../lib/hooks/use-budgets";
import { useTheme } from "../../lib/theme-context";

const monthFmt = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

export default function AddBudgetModal() {
  const theme = useTheme();
  const router = useRouter();
  const create = useCreateBudget();
  const EXPENSE_CATEGORIES = useCategoriesByGroup("expense");

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState("");

  async function submit() {
    if (!categoryId) {
      Alert.alert("Falta la categoría", "Elegí para qué categoría es el presupuesto.");
      return;
    }
    const limitNum = Number(limit.replace(",", "."));
    if (!limit.trim() || Number.isNaN(limitNum) || limitNum <= 0) {
      Alert.alert("Monto inválido", "Ingresá un límite mayor a cero.");
      return;
    }

    try {
      await create.mutateAsync({ category: categoryId, limit_ars: limitNum });
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el presupuesto.");
    }
  }

  return (
    <FormScreen title="Nuevo presupuesto">
      <Text style={[styles.help, { color: theme.textDim }]}>
        Límite mensual para {monthFmt.format(new Date())}. El gasto se actualiza solo con tus movimientos.
      </Text>

      <FormField label="Categoría">
        <ChipRow>
          {EXPENSE_CATEGORIES.map((c) => (
            <FormChip
              key={c.id}
              label={`${c.icon} ${c.label}`}
              active={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Límite mensual (ARS)">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={limit} onChangeText={setLimit} />
      </FormField>

      <SubmitButton label={create.isPending ? "Guardando…" : "Guardar presupuesto"} onPress={submit} busy={create.isPending} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, lineHeight: 18 },
});
