// Lee v_net_worth (vista pre-calculada). RLS por security_invoker filtra
// a las rows del usuario actual; con maybeSingle obtenemos su única fila.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { freshenPlazoFijo, useInvestments } from "./use-investments";
import { useExchangeRates } from "./use-exchange-rates";

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

// v_net_worth suma `investments.current_value_*`, que para plazos fijos solo se
// actualiza al correr el cron de precios. Acá ajustamos el patrimonio por el
// delta de interés devengado recalculado al vuelo (mismo criterio que la
// pantalla de Inversiones, ver freshenPlazoFijo), para que el dashboard no
// quede ~1 día atrasado fuera de horario bursátil.
export function useFreshNetWorth() {
  const nw = useNetWorth();
  const { data: investments } = useInvestments();
  const { data: rates } = useExchangeRates();
  const mep = rates?.mep ?? null;

  const data = useMemo(() => {
    if (!nw.data) return nw.data;
    let dArs = 0;
    let dUsd = 0;
    for (const inv of investments ?? []) {
      if (inv.type !== "plazo_fijo") continue;
      const fresh = freshenPlazoFijo(inv, mep);
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
