// Saldar una deuda del grupo ("X le pagó $N a Y"). Ledger separado del patrimonio:
// por defecto el settlement NO toca tus finanzas personales. Si el usuario tilda
// "registrar como movimiento", además creamos una transacción real en una cuenta
// suya y la enlazamos vía recorded_transaction_id (puente opcional con el ledger).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gdb } from "../groups-types";
import { supabase } from "../supabase";

export type SettleInput = {
  groupId: string;
  fromMember: string;
  toMember: string;
  amountArs: number;
  amountUsd: number | null;
  usdRateUsed: number | null;
  date: string;
  note?: string | null;
  // Si está, registramos también un movimiento real en el ledger personal.
  record?: {
    accountId: string;
    type: "income" | "expense"; // expense si yo pagué, income si me pagaron
  } | null;
};

export function useSettle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SettleInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      let recordedTxId: string | null = null;
      if (input.record) {
        const { data: tx, error: txErr } = await supabase
          .from("transactions")
          .insert({
            owner_id: user.user.id,
            account_id: input.record.accountId,
            type: input.record.type,
            category: "transfers",
            amount_ars: input.amountArs,
            amount_usd: input.amountUsd,
            usd_rate_used: input.usdRateUsed,
            description: input.note?.trim() || "Saldo de gastos compartidos",
            source: "manual",
          })
          .select("id")
          .single();
        if (txErr) throw txErr;
        recordedTxId = tx.id;
      }

      const { error } = await gdb.from("settlements").insert({
        group_id: input.groupId,
        from_member: input.fromMember,
        to_member: input.toMember,
        amount_ars: input.amountArs,
        currency: "ARS",
        date: input.date,
        note: input.note?.trim() || null,
        recorded_transaction_id: recordedTxId,
        created_by: user.user.id,
      });
      if (error) {
        // Si falla el settlement pero ya creamos la tx, la revertimos.
        if (recordedTxId) await supabase.from("transactions").delete().eq("id", recordedTxId);
        throw error;
      }
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["groups", "detail", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["groups", "balances"] });
      if (vars.record) {
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["net_worth"] });
        qc.invalidateQueries({ queryKey: ["accounts"] });
      }
    },
  });
}
