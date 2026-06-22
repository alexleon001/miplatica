import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "../database.types";
import type { FciFund } from "../fci";
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

// Los FCI no tienen cron de precios: el VCP se actualiza 1 vez al día y vive en
// argentinadatos (useFciFunds), no en asset_prices. Esta función recalcula el
// valor de una posición FCI al vuelo con el VCP de hoy, igual que freshenPlazoFijo.
// Para el resto de instrumentos devuelve la posición sin cambios.
export function freshenFci(inv: Investment, fundsBySlug: Map<string, FciFund>, mep: number | null): Investment {
  if (inv.type !== "fci" || !inv.ticker) return inv;
  const fund = fundsBySlug.get(inv.ticker);
  if (!fund) return inv;
  const d = deriveInvestmentValues({
    type: "fci",
    currency: inv.currency as InstrumentCurrency,
    quantity: inv.quantity,
    avgCost: inv.currency === "USD" ? inv.avg_cost_usd : inv.avg_cost_ars,
    currentPrice: fund.vcp,
    mep,
  });
  return {
    ...inv,
    current_price_ars: d.current_price_ars,
    current_price_usd: d.current_price_usd,
    current_value_ars: d.current_value_ars,
    current_value_usd: d.current_value_usd,
    profit_loss_ars: d.profit_loss_ars,
    profit_loss_usd: d.profit_loss_usd,
    profit_loss_pct: d.profit_loss_pct,
  };
}

// Para posiciones en USD (cripto, dólar billete, ON, etc.) el valor confiable es
// `current_value_usd`; el valor en moneda local se deriva con la tasa elegida.
// El cron `update-asset-prices`/`refresh_positions` escribe `current_value_ars`
// con el MEP de Argentina server-side → para un usuario VE (paralelo) ese "ars"
// (=VES) quedaría calculado con la tasa argentina (muy inflado). Recalculamos el
// valor local al vuelo desde USD × tasa del país. En AR con MEP no cambia nada.
export function freshenUsdValue(inv: Investment, rate: number | null): Investment {
  if (inv.currency !== "USD" || rate == null || rate <= 0) return inv;
  if (inv.current_value_usd == null) return inv;
  const r2 = (n: number | null): number | null => (n == null ? null : Math.round(n * rate * 100) / 100);
  const r4 = (n: number | null): number | null => (n == null ? null : Math.round(n * rate * 10000) / 10000);
  return {
    ...inv,
    current_value_ars: r2(inv.current_value_usd),
    profit_loss_ars: r2(inv.profit_loss_usd),
    current_price_ars: r4(inv.current_price_usd),
    avg_cost_ars: r4(inv.avg_cost_usd),
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
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
