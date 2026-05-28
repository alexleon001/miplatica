// Mutation con optimistic update sobre la lista de transactions.
// Flujo:
//   onMutate     → cancela queries, snapshot, inserta row optimista al inicio
//   mutationFn   → POST a Supabase, devuelve row real
//   onError      → rollback al snapshot
//   onSettled    → invalida transactions/net_worth/monthly_balance/accounts
//
// El optimistic ID es un UUID-like local; cuando llega el real, la invalidación
// reemplaza la row.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TablesInsert } from "../database.types";
import type { Transaction } from "./use-transactions";
import { supabase } from "../supabase";

export type CreateTransactionInput = Omit<TablesInsert<"transactions">, "owner_id">;

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function useCreateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...input, owner_id: user.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });

      const previousLists = qc.getQueriesData<Transaction[]>({ queryKey: ["transactions", "list"] });

      const optimistic: Transaction = {
        id: localId(),
        owner_id: "",
        account_id: input.account_id,
        type: input.type,
        category: input.category ?? null,
        subcategory: input.subcategory ?? null,
        amount_ars: input.amount_ars,
        amount_usd: input.amount_usd ?? null,
        usd_rate_used: input.usd_rate_used ?? null,
        description: input.description ?? null,
        merchant: input.merchant ?? null,
        date: input.date ?? new Date().toISOString().slice(0, 10),
        source: input.source ?? "manual",
        external_id: input.external_id ?? null,
        tags: input.tags ?? null,
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
      };

      for (const [key, list] of previousLists) {
        qc.setQueryData<Transaction[]>(key, list ? [optimistic, ...list] : [optimistic]);
      }

      return { previousLists };
    },

    onError: (_err, _input, ctx) => {
      if (!ctx) return;
      for (const [key, list] of ctx.previousLists) {
        qc.setQueryData(key, list);
      }
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
