// Trae los movimientos de los últimos N meses (gastos + ingresos) para la
// pantalla de Insights: tendencia mensual, comparación mes a mes y categorías
// que más crecieron. Filtra por fecha; trae ambos tipos (a diferencia de
// use-month-spending, que es solo gasto del mes en curso).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import {
  categoryMovers,
  monthlyTotals,
  previousPeriod,
  shiftPeriod,
  spendTrend,
  type TxRow,
} from "../insights";

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const INSIGHTS_MONTHS = 6;

export function useInsights(months: number = INSIGHTS_MONTHS) {
  const end = currentPeriod();
  const since = `${shiftPeriod(end, -(months - 1))}-01`;

  return useQuery({
    queryKey: ["transactions", "insights", end, months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, category, amount_ars, amount_usd, date")
        .gte("date", since)
        .limit(5000);
      if (error) throw error;

      const rows = (data ?? []) as TxRow[];
      const series = monthlyTotals(rows, end, months);
      return {
        series,
        trend: spendTrend(series),
        movers: categoryMovers(rows, end, previousPeriod(end)),
        currentPeriod: end,
        previousPeriod: previousPeriod(end),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
