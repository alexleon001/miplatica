// Deudas activas + alta. Las deudas restan al patrimonio neto (v_net_worth
// suma debts_ars/usd con signo negativo), por eso al crear invalidamos también
// net_worth.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables, TablesInsert, TablesUpdate } from "../database.types";
import { supabase } from "../supabase";

export type Debt = Tables<"debts">;
export type CreateDebtInput = Omit<TablesInsert<"debts">, "owner_id">;

export function useDebts() {
  return useQuery({
    queryKey: ["debts", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDebtInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const { data, error } = await supabase
        .from("debts")
        .insert({ ...input, owner_id: user.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"debts"> }) => {
      const { error } = await supabase.from("debts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}

// Soft-delete: marca is_active=false.
export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}
