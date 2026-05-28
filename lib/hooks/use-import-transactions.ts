// Importación masiva de movimientos (CSV de broker/banco) → transactions.
// Dedup obligatoria (regla #4): upsert con onConflict sobre la constraint
// (owner_id, source, external_id) e ignoreDuplicates → ON CONFLICT DO NOTHING.
// Devuelve {inserted, skipped} comparando lo pedido vs lo realmente insertado.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ParsedMovement } from "../broker-import";
import { supabase } from "../supabase";

export type ImportInput = {
  movements: ParsedMovement[];
  accountId: string;
};

export type ImportResult = {
  inserted: number;
  skipped: number;
};

export function useImportTransactions() {
  const qc = useQueryClient();

  return useMutation<ImportResult, Error, ImportInput>({
    mutationFn: async ({ movements, accountId }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const rows = movements.map((m) => ({
        owner_id: user.user!.id,
        account_id: accountId,
        type: m.type,
        category: m.category,
        amount_ars: m.amountArs,
        description: m.description,
        date: m.date,
        source: "csv_import",
        external_id: m.externalId,
      }));

      const { data, error } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "owner_id,source,external_id", ignoreDuplicates: true })
        .select();

      if (error) throw error;

      const inserted = data?.length ?? 0;
      return { inserted, skipped: rows.length - inserted };
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
