// Hook de referencia: lee la última cotización cacheada en exchange_rates.
// Self-healing: si la última row no es de hoy, dispara la Edge Function
// fetch-exchange-rates y reintenta (best-effort: si la invocación falla,
// devolvemos la data stale en lugar de romper toda la UI).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { type UsdType, useCurrencyStore } from "../store/currency";

// Tasa (moneda local por USD) para el tipo de dólar elegido. El shape de la fila
// de exchange_rates varía por país (mep/blue/oficial/ccl/tarjeta en AR,
// bcv/paralelo en VE) → lookup laxo por clave en vez de acceso tipado.
export function rateForUsdType(
  row: Record<string, unknown> | null | undefined,
  usdType: UsdType,
): number | null {
  if (!row) return null;
  const v = row[usdType];
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchLatest() {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ["exchange_rates", "latest"],
    queryFn: async () => {
      let row = await fetchLatest();
      if (!row || row.date !== todayIso()) {
        try {
          await supabase.functions.invoke("fetch-exchange-rates");
          row = await fetchLatest();
        } catch (e) {
          // Best-effort: si la edge function falla, devolvemos lo que haya.
          console.warn("[useExchangeRates] auto-trigger falló:", e);
        }
      }
      return row;
    },
    staleTime: 1000 * 60 * 15, // tasas se actualizan cada 30 min server-side
  });
}

// Tasa de la moneda local por USD según el país/tipo de dólar elegido por el
// usuario (mep/blue/… en AR, bcv/paralelo en VE). Es el factor de conversión
// local<->USD para proyección, inversiones, simulador y patrimonio. Reemplaza al
// `rates?.mep` hardcodeado (que en VE sería null y rompía la conversión).
export function useLocalUsdRate(): number | null {
  const { data } = useExchangeRates();
  const usdType = useCurrencyStore((s) => s.usdType);
  return rateForUsdType(data, usdType);
}
