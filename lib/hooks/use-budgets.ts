import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useBudgets(year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  return useQuery({
    queryKey: ["budgets", y, m],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("year", y)
        .eq("month", m)
        .order("category");

      if (error) throw error;
      return data;
    },
  });
}

export type CreateBudgetInput = {
  category: string;
  limit_ars: number;
  year?: number;
  month?: number;
};

export function useCreateBudget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const now = new Date();
      const row = {
        owner_id: user.user.id,
        category: input.category,
        limit_ars: input.limit_ars,
        year: input.year ?? now.getFullYear(),
        month: input.month ?? now.getMonth() + 1,
      };

      // Upsert por la constraint (owner_id, year, month, category): re-crear una
      // categoría ya presupuestada actualiza su límite. spent_ars lo mantiene el
      // trigger (init en insert / sync en cada transacción).
      const { data, error } = await supabase
        .from("budgets")
        .upsert(row, { onConflict: "owner_id,year,month,category" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
