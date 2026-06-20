// Alta/baja de gastos compartidos. Un gasto = una fila en shared_expenses + N
// filas en expense_splits (lo que le toca a cada miembro). Las partes ya vienen
// calculadas por lib/splits (buildSplits). Si falla la inserción de los splits,
// hacemos rollback borrando el gasto para no dejar un gasto sin repartir.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gdb, type SharedExpense, type SplitType } from "../groups-types";
import { supabase } from "../supabase";

export type CreateSharedExpenseInput = {
  groupId: string;
  paidBy: string;          // group_member id
  amountArs: number;
  amountUsd: number | null;
  usdRateUsed: number | null;
  description: string;
  category: string | null;
  date: string;            // YYYY-MM-DD
  splitType: SplitType;
  // Partes por miembro (suma == amountArs).
  splits: { member_id: string; amount: number; share?: number }[];
};

export function useCreateSharedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSharedExpenseInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const { data: exp, error } = await gdb
        .from("shared_expenses")
        .insert({
          group_id: input.groupId,
          paid_by: input.paidBy,
          amount_ars: input.amountArs,
          amount_usd: input.amountUsd,
          currency: "ARS",
          usd_rate_used: input.usdRateUsed,
          description: input.description.trim(),
          category: input.category,
          date: input.date,
          split_type: input.splitType,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      const expense = exp as SharedExpense;

      const rows = input.splits.map((s) => ({
        expense_id: expense.id,
        member_id: s.member_id,
        amount_ars: s.amount,
        share: s.share ?? null,
      }));
      const { error: splitErr } = await gdb.from("expense_splits").insert(rows);
      if (splitErr) {
        // Rollback: el gasto quedó sin partes → lo borramos para no corromper balances.
        await gdb.from("shared_expenses").delete().eq("id", expense.id);
        throw splitErr;
      }
      return expense;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["groups", "detail", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["groups", "balances"] });
    },
  });
}

export function useDeleteSharedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId }: { groupId: string; expenseId: string }) => {
      // expense_splits tiene ON DELETE CASCADE → se borran solas.
      const { error } = await gdb.from("shared_expenses").delete().eq("id", expenseId);
      if (error) throw error;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["groups", "detail", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["groups", "balances"] });
    },
  });
}
