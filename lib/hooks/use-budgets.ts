import { useQuery } from "@tanstack/react-query";
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
