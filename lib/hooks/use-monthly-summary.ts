// Wrapper sobre la Edge Function monthly-summary. Pide el resumen del mes (la
// función arma los números server-side vía RLS). Cache largo + persistido (24h)
// para no re-llamar a la IA cada vez que se abre la pantalla; botón "Actualizar"
// fuerza un refetch.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type MonthlySummary = { summary: string; period: string };

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useMonthlySummary(period: string) {
  return useQuery({
    queryKey: ["monthly-summary", period],
    queryFn: async (): Promise<MonthlySummary> => {
      const { data, error } = await supabase.functions.invoke<MonthlySummary>("monthly-summary", {
        body: { period },
      });
      if (error) throw error;
      if (!data?.summary) throw new Error("No se pudo generar el resumen");
      return data;
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 h: el mes no cambia tan rápido
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}
