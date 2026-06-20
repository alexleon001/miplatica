// Lista de grupos de gastos compartidos + alta/archivo. La feature es Pro pero
// gratis limitada: el límite (1 grupo activo para Free) se enforce server-side en
// la función create_expense_group (el cliente no decide). Si el RPC lo rechaza,
// useCreateGroup lanza un error marcado para que la pantalla derive al paywall.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ExpenseGroup, gdb, type GroupCurrency, type GroupKind } from "../groups-types";

export const GROUP_LIMIT_ERROR = "group_limit_reached";

export function useGroups() {
  return useQuery({
    queryKey: ["groups", "list"],
    queryFn: async () => {
      // RLS ya filtra a los grupos donde el usuario es miembro o creador.
      const { data, error } = await gdb
        .from("expense_groups")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpenseGroup[];
    },
  });
}

// Saldo neto del usuario por grupo (>0 le deben, <0 debe). Un RPC, sin N+1.
export function useMyGroupBalances() {
  return useQuery({
    queryKey: ["groups", "balances"],
    queryFn: async () => {
      const { data, error } = await gdb.rpc("my_group_balances");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as { group_id: string; net: number }[]) {
        map.set(row.group_id, Number(row.net));
      }
      return map;
    },
  });
}

export type CreateGroupInput = { name: string; kind: GroupKind; currency: GroupCurrency };

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGroupInput) => {
      const { data, error } = await gdb.rpc("create_expense_group", {
        p_name: input.name,
        p_kind: input.kind,
        p_currency: input.currency,
      });
      if (error) {
        // El RPC lanza 'group_limit_reached' cuando un Free intenta el 2° grupo.
        if (typeof error.message === "string" && error.message.includes(GROUP_LIMIT_ERROR)) {
          throw new Error(GROUP_LIMIT_ERROR);
        }
        throw error;
      }
      return data as string; // id del grupo nuevo
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<ExpenseGroup, "name" | "kind" | "default_currency">> }) => {
      const { error } = await gdb.from("expense_groups").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

// Archivar = soft-delete. Libera el cupo Free (el límite cuenta grupos activos).
export function useArchiveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gdb.from("expense_groups").update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
