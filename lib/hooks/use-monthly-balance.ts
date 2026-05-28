import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useMonthlyBalance(year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  return useQuery({
    queryKey: ["monthly_balance", y, m],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_monthly_balance")
        .select("*")
        .eq("year", y)
        .eq("month", m)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
