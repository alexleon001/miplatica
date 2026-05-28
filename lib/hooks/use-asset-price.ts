// Lee la última cotización cacheada de un ticker en asset_prices.
// La tabla es global (RLS lectura pública). La pobla la Edge Function
// update-asset-prices (cron 15 min). El modal add-investment usa este hook
// para prellenar el precio actual de un CEDEAR/acción/etc.

import { useQuery } from "@tanstack/react-query";
import type { Tables } from "../database.types";
import { supabase } from "../supabase";

export type AssetPrice = Tables<"asset_prices">;

export function useAssetPrice(ticker: string | null | undefined) {
  const normalized = ticker?.trim().toUpperCase() || null;

  return useQuery({
    queryKey: ["asset_prices", normalized],
    enabled: !!normalized,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_prices")
        .select("*")
        .eq("ticker", normalized as string)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
