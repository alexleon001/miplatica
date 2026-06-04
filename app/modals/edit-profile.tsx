import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { useProfile, useUpdateProfile } from "../../lib/hooks/use-profile";
import { useCurrencyStore } from "../../lib/store/currency";

type UsdType = "mep" | "blue" | "oficial" | "ccl" | "tarjeta";
type Display = "ars" | "usd" | "both";

const USD_OPTIONS: { value: UsdType; label: string }[] = [
  { value: "mep", label: "MEP" },
  { value: "blue", label: "Blue" },
  { value: "oficial", label: "Oficial" },
  { value: "ccl", label: "CCL" },
  { value: "tarjeta", label: "Tarjeta" },
];

const DISPLAY_OPTIONS: { value: Display; label: string }[] = [
  { value: "ars", label: "Solo ARS" },
  { value: "usd", label: "Solo USD" },
  { value: "both", label: "Ambas" },
];

function parseNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

export default function EditProfileModal() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const setUsdTypeStore = useCurrencyStore((s) => s.setUsdType);

  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [usdType, setUsdType] = useState<UsdType>("mep");
  const [display, setDisplayState] = useState<Display>("both");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setIncome(profile.monthly_income_ars != null ? String(profile.monthly_income_ars) : "");
    setUsdType((profile.preferred_usd_type as UsdType) ?? "mep");
    setDisplayState((profile.currency_display as Display) ?? "both");
  }, [profile]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta tu nombre", "Ponete un alias o nombre.");
      return;
    }
    const incomeNum = income.trim() === "" ? null : parseNum(income);
    if (incomeNum != null && (Number.isNaN(incomeNum) || incomeNum < 0)) {
      Alert.alert("Ingreso inválido", "Usá solo números (ej: 2100000).");
      return;
    }

    try {
      await update.mutateAsync({
        name: name.trim(),
        monthly_income_ars: incomeNum,
        preferred_usd_type: usdType,
        currency_display: display,
      });
      // Mantener el store de moneda en sync con el perfil (igual que el layout).
      setUsdTypeStore(usdType);
      setDisplay(display);
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar el perfil.");
    }
  }

  return (
    <FormScreen title="Editar perfil">
      <FormField label="¿Cómo te llamamos?">
        <FormInput placeholder="Alex" value={name} onChangeText={setName} />
      </FormField>

      <FormField label="Ingreso mensual (ARS)" hint="Se usa como sueldo neto por defecto en la proyección de pagos.">
        <FormInput placeholder="0" keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
      </FormField>

      <FormField label="Dólar preferido">
        <ChipRow>
          {USD_OPTIONS.map((opt) => (
            <FormChip key={opt.value} label={opt.label} active={usdType === opt.value} onPress={() => setUsdType(opt.value)} />
          ))}
        </ChipRow>
      </FormField>

      <FormField label="¿Cómo querés ver los montos?">
        <ChipRow>
          {DISPLAY_OPTIONS.map((opt) => (
            <FormChip
              key={opt.value}
              label={opt.label}
              active={display === opt.value}
              onPress={() => setDisplayState(opt.value)}
            />
          ))}
        </ChipRow>
      </FormField>

      <SubmitButton label={update.isPending ? "Guardando…" : "Guardar cambios"} onPress={submit} busy={update.isPending} />
    </FormScreen>
  );
}
