// Lee la distribución del portafolio por tipo de instrumento desde la vista SQL
// `v_portfolio_by_type` (agregación server-side, RLS por security_invoker).
// Reemplaza la agregación client-side que vivía en PortfolioDistribution.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type PortfolioSlice = {
  type: string;
  value_ars: number;
  value_usd: number;
  position_count: number;
  pct: number;
};

export function usePortfolioByType() {
  return useQuery({
    queryKey: ["portfolio", "by_type"],
    queryFn: async (): Promise<PortfolioSlice[]> => {
      const { data, error } = await supabase
        .from("v_portfolio_by_type")
        .select("type, value_ars, value_usd, position_count, pct")
        .order("value_ars", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((r): r is typeof r & { type: string } => r.type != null)
        .map((r) => ({
          type: r.type,
          value_ars: Number(r.value_ars ?? 0),
          value_usd: Number(r.value_usd ?? 0),
          position_count: Number(r.position_count ?? 0),
          pct: Number(r.pct ?? 0),
        }));
    },
  });
}
