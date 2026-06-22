// Lee v_net_worth (vista pre-calculada). RLS por security_invoker filtra
// a las rows del usuario actual; con maybeSingle obtenemos su única fila.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { freshenPlazoFijo, freshenUsdValue, useInvestments } from "./use-investments";
import { useLocalUsdRate } from "./use-exchange-rates";

export function useNetWorth() {
  return useQuery({
    queryKey: ["net_worth"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_net_worth")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// v_net_worth suma `investments.current_value_*`, calculados por el cron de
// precios. Acá ajustamos el patrimonio al vuelo por dos motivos: (1) el interés
// devengado de plazos fijos crece a diario (freshenPlazoFijo), y (2) las
// posiciones en USD: el cron escribe su valor local con el MEP de AR, pero un
// usuario VE (o AR con otro dólar) lo quiere a SU tasa → freshenUsdValue. Así el
// dashboard no queda atrasado ni con la moneda local mal convertida.
export function useFreshNetWorth() {
  const nw = useNetWorth();
  const { data: investments } = useInvestments();
  const mep = useLocalUsdRate();

  const data = useMemo(() => {
    if (!nw.data) return nw.data;
    let dArs = 0;
    let dUsd = 0;
    for (const inv of investments ?? []) {
      const fresh = freshenUsdValue(freshenPlazoFijo(inv, mep), mep);
      dArs += (fresh.current_value_ars ?? 0) - (inv.current_value_ars ?? 0);
      dUsd += (fresh.current_value_usd ?? 0) - (inv.current_value_usd ?? 0);
    }
    if (dArs === 0 && dUsd === 0) return nw.data;
    return {
      ...nw.data,
      investments_ars: (nw.data.investments_ars ?? 0) + dArs,
      investments_usd: (nw.data.investments_usd ?? 0) + dUsd,
      net_ars: (nw.data.net_ars ?? 0) + dArs,
      net_usd: (nw.data.net_usd ?? 0) + dUsd,
    };
  }, [nw.data, investments, mep]);

  return { ...nw, data };
}
