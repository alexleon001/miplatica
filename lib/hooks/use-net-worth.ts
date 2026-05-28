// Lee v_net_worth (vista pre-calculada). RLS por security_invoker filtra
// a las rows del usuario actual; con maybeSingle obtenemos su única fila.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

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
