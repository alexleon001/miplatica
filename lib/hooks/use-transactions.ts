import { useQuery } from "@tanstack/react-query";
import type { Tables } from "../database.types";
import { supabase } from "../supabase";

export type Transaction = Tables<"transactions">;

const DEFAULT_LIMIT = 50;

export function useTransactions(limit: number = DEFAULT_LIMIT) {
  return useQuery({
    queryKey: ["transactions", "list", { limit }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}
