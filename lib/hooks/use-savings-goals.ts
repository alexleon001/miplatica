// Metas de ahorro (savings_goals). Son objetivos del usuario (ej: "Auto",
// "Vacaciones"): no entran al patrimonio neto, así que solo invalidamos su
// propia query. Borrado físico (la tabla no tiene is_active).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables, TablesInsert, TablesUpdate } from "../database.types";
import { supabase } from "../supabase";

export type SavingsGoal = Tables<"savings_goals">;
export type CreateGoalInput = Omit<TablesInsert<"savings_goals">, "owner_id">;

export function useSavingsGoals() {
  return useQuery({
    queryKey: ["savings_goals", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const { data, error } = await supabase
        .from("savings_goals")
        .insert({ ...input, owner_id: user.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["savings_goals"] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"savings_goals"> }) => {
      const { error } = await supabase.from("savings_goals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["savings_goals"] }),
  });
}

// Aportar a una meta: suma `amount` a lo ahorrado. Lee el valor fresco del
// server para no pisar otros aportes con data stale.
export function useAddGoalContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: row, error: readErr } = await supabase
        .from("savings_goals")
        .select("current_amount")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;

      const next = Number(row.current_amount) + amount;
      const { error } = await supabase.from("savings_goals").update({ current_amount: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["savings_goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["savings_goals"] }),
  });
}
