import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
