// Hook de referencia: lee la última cotización cacheada en exchange_rates.
// Self-healing: si la última row no es de hoy, dispara la Edge Function
// fetch-exchange-rates y reintenta (best-effort: si la invocación falla,
// devolvemos la data stale en lugar de romper toda la UI).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

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
