import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { GROUP_LIMIT_ERROR, useCreateGroup } from "../../lib/hooks/use-groups";
import type { GroupCurrency, GroupKind } from "../../lib/groups-types";

const KINDS: { value: GroupKind; label: string }[] = [
  { value: "trip", label: "Viaje" },
  { value: "household", label: "Convivencia" },
  { value: "outing", label: "Salida" },
  { value: "other", label: "Otro" },
];

const CURRENCIES: GroupCurrency[] = ["ARS", "USD"];

export default function AddGroupModal() {
  const router = useRouter();
  const create = useCreateGroup();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<GroupKind>("trip");
  const [currency, setCurrency] = useState<GroupCurrency>("ARS");

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre al grupo (ej: Bariloche 2026, Depto Palermo).");
      return;
    }
    try {
      const id = await create.mutateAsync({ name: name.trim(), kind, currency });
      // Reemplazamos el modal por el detalle del grupo recién creado.
      router.replace(`/groups/${id}`);
    } catch (e) {
      if (e instanceof Error && e.message === GROUP_LIMIT_ERROR) {
        router.replace("/paywall");
        return;
      }
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude crear el grupo.");
    }
  }

  return (
    <FormScreen title="Nuevo grupo">
      <FormField label="Nombre">
        <FormInput placeholder="Bariloche 2026, Depto Palermo…" value={name} onChangeText={setName} autoFocus />
      </FormField>

      <FormField label="Tipo">
        <ChipRow>
          {KINDS.map((k) => (
            <FormChip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="Moneda del grupo">
        <ChipRow>
          {CURRENCIES.map((c) => (
            <FormChip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </ChipRow>
      </FormField>

      <SubmitButton
        label={create.isPending ? "Creando…" : "Crear grupo"}
        onPress={submit}
        busy={create.isPending}
      />
    </FormScreen>
  );
}
