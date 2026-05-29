// Hook de referencia: lee la serie de IPC mensual cacheada en `inflation`.
// Self-healing igual que useExchangeRates: si falta el mes anterior (el dato sale
// con ~1 mes de atraso), dispara la Edge fetch-inflation y reintenta (best-effort).

import { useQuery } from "@tanstack/react-query";
import type { InflationRow } from "../inflation";
import { monthStart } from "../inflation";
import { supabase } from "../supabase";

// Mes esperado más reciente: el mes anterior al actual (el IPC sale con atraso).
function expectedLatestMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 8) + "01";
}

async function fetchSeries(): Promise<InflationRow[]> {
  const { data, error } = await supabase
    .from("inflation")
    .select("month, ipc")
    .order("month", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ month: monthStart(r.month) ?? r.month, ipc: Number(r.ipc) }));
}

export function useInflation() {
  return useQuery({
    queryKey: ["inflation", "series"],
    queryFn: async () => {
      let rows = await fetchSeries();
      const latest = rows.length ? rows[rows.length - 1].month : null;
      if (!latest || latest < expectedLatestMonth()) {
        try {
          await supabase.functions.invoke("fetch-inflation");
          rows = await fetchSeries();
        } catch (e) {
          // Best-effort: si la edge falla, devolvemos lo que haya.
          console.warn("[useInflation] auto-trigger falló:", e);
        }
      }
      return rows;
    },
    staleTime: 1000 * 60 * 60 * 24, // el IPC es mensual; refrescar 1×/día sobra
  });
}
