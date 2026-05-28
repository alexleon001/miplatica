import { useQuery } from "@tanstack/react-query";
import type { Tables } from "../database.types";
import { supabase } from "../supabase";

export type Investment = Tables<"investments">;

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
