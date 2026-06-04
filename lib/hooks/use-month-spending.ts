// Trae los gastos del mes en curso para el desglose por categoría. Aparte de
// useTransactions (que limita a 50 los más recientes), este filtra por mes y
// tipo=expense para que el desglose cubra TODO el mes.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { spendingByCategory, type SpendingRow } from "../spending";

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useMonthSpending(period: string = currentPeriod()) {
  const since = `${period}-01`;
  return useQuery({
    queryKey: ["transactions", "month-spending", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, category, amount_ars, amount_usd, date")
        .eq("type", "expense")
        .gte("date", since)
        .limit(1000);
      if (error) throw error;
      return spendingByCategory((data ?? []) as SpendingRow[], period);
    },
    staleTime: 1000 * 60 * 5,
  });
}
