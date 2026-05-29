import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "../database.types";
import { deriveInvestmentValues, type InstrumentCurrency } from "../instruments";
import { supabase } from "../supabase";

export type Investment = Tables<"investments">;

// El interés devengado de un plazo fijo crece cada día, pero los campos
// derivados (current_value_*, profit_loss_*) solo se recalculan cuando corre el
// cron `update-asset-prices`/`refresh_positions`. Fuera de horario bursátil eso
// puede mostrarse con ~1 día de atraso. Esta función lo recalcula al vuelo en el
// cliente reusando la misma lógica pura (deriveInvestmentValues, con la fecha de
// hoy). Para el resto de instrumentos devuelve la posición sin cambios.
export function freshenPlazoFijo(inv: Investment, mep: number | null): Investment {
  if (inv.type !== "plazo_fijo") return inv;
  const d = deriveInvestmentValues({
    type: "plazo_fijo",
    currency: inv.currency as InstrumentCurrency,
    quantity: inv.quantity,
    interestRate: inv.interest_rate,
    purchaseDate: inv.purchase_date,
    maturityDate: inv.maturity_date,
    avgCost: null,
    currentPrice: null,
    mep,
  });
  return {
    ...inv,
    avg_cost_ars: d.avg_cost_ars,
    avg_cost_usd: d.avg_cost_usd,
    current_value_ars: d.current_value_ars,
    current_value_usd: d.current_value_usd,
    profit_loss_ars: d.profit_loss_ars,
    profit_loss_usd: d.profit_loss_usd,
    profit_loss_pct: d.profit_loss_pct,
  };
}

export function useInvestments() {
  return useQuery({
    queryKey: ["investments", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .order("current_value_ars", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}
