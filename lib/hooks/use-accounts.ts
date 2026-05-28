import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TablesUpdate } from "../database.types";
import { supabase } from "../supabase";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"accounts"> }) => {
      const { error } = await supabase.from("accounts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}

// Soft-delete: marca is_active=false (las transacciones referencian la cuenta
// con on delete restrict, así que no se borra físicamente).
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}
