import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables, TablesUpdate } from "../database.types";
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

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"transactions"> }) => {
      const { error } = await supabase.from("transactions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["monthly_balance"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

// Categoriza en lote los movimientos sin categoría (Edge categorize-batch, IA).
export function useCategorizeBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ categorized: number; remaining: number; chunks: number }> => {
      const { data, error } = await supabase.functions.invoke("categorize-batch", { body: {} });
      if (error) throw error;
      return data as { categorized: number; remaining: number; chunks: number };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["monthly_balance"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["monthly_balance"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
