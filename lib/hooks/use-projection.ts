// CRUD de la proyección de pagos: ítems estructurados + overrides de ingreso.
// La grilla se arma client-side (lib/projection.ts) combinando estos ítems con
// las deudas (use-debts) y el ingreso del perfil.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables, TablesInsert, TablesUpdate } from "../database.types";
import { monthKey } from "../projection";
import { supabase } from "../supabase";

export type ProjectionItem = Tables<"projection_items">;
export type CreateProjectionItemInput = Omit<TablesInsert<"projection_items">, "owner_id">;

export function useProjectionItems() {
  return useQuery({
    queryKey: ["projection_items", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projection_items")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProjectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectionItemInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("projection_items")
        .insert({ ...input, owner_id: user.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projection_items"] }),
  });
}

export function useUpdateProjectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"projection_items"> }) => {
      const { error } = await supabase.from("projection_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projection_items"] }),
  });
}

// Soft-delete: marca is_active=false (consistente con debts).
export function useDeleteProjectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projection_items").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projection_items"] }),
  });
}

// Overrides de ingreso por mes → mapa { "YYYY-MM-01": amount_ars }.
export function useProjectionIncome() {
  return useQuery({
    queryKey: ["projection_income"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("projection_income")
        .select("month, amount_ars");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[monthKey(r.month)] = Number(r.amount_ars);
      return map;
    },
  });
}

export function useSetProjectionIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, amountArs }: { month: string; amountArs: number }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");
      const { error } = await supabase
        .from("projection_income")
        .upsert(
          { owner_id: user.user.id, month: monthKey(month), amount_ars: amountArs },
          { onConflict: "owner_id,month" },
        );
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projection_income"] }),
  });
}

export function useClearProjectionIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) => {
      const { error } = await supabase.from("projection_income").delete().eq("month", monthKey(month));
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projection_income"] }),
  });
}
