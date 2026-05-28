// Hook de referencia: lee la última cotización cacheada en exchange_rates.
// Patrón a seguir para los demás hooks de Sprint 1 en adelante.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useExchangeRates() {
  return useQuery({
    queryKey: ["exchange_rates", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 15, // tasas se actualizan cada 30 min server-side
  });
}
