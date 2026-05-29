// Mutation con optimistic update sobre la lista de investments.
// Mismo patrón que useCreateTransaction:
//   onMutate   → cancela queries, snapshot, inserta posición optimista
//   mutationFn → deriva valores (deriveInvestmentValues) + insert en Supabase
//   onError    → rollback al snapshot
//   onSettled  → invalida investments + net_worth (la posición suma al patrimonio)
//
// La conversión ARS<->USD usa la tasa `mep` que le pasa el modal (toma la del
// usdType activo del store), para que current_value_usd quede poblado y la vista
// v_net_worth lo refleje.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deriveInvestmentValues,
  type InstrumentCurrency,
  type InstrumentType,
} from "../instruments";
import type { Investment } from "./use-investments";
import { supabase } from "../supabase";

export type CreateInvestmentInput = {
  type: InstrumentType;
  name: string;
  ticker?: string | null;
  currency: InstrumentCurrency;
  quantity: number;
  avgCost?: number | null;
  currentPrice?: number | null;
  interestRate?: number | null;
  purchaseDate?: string | null;
  maturityDate?: string | null;
  accountId?: string | null;
  mep: number | null;
};

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function buildRow(input: CreateInvestmentInput) {
  const derived = deriveInvestmentValues({
    type: input.type,
    currency: input.currency,
    quantity: input.quantity,
    avgCost: input.avgCost ?? null,
    currentPrice: input.currentPrice ?? null,
    interestRate: input.interestRate ?? null,
    purchaseDate: input.purchaseDate ?? null,
    maturityDate: input.maturityDate ?? null,
    mep: input.mep,
  });

  return {
    type: input.type,
    name: input.name,
    ticker: input.ticker ?? null,
    currency: input.currency,
    quantity: input.quantity,
    account_id: input.accountId ?? null,
    interest_rate: input.interestRate ?? null,
    purchase_date: input.purchaseDate ?? null,
    maturity_date: input.maturityDate ?? null,
    last_updated: new Date().toISOString(),
    ...derived,
  };
}

export function useCreateInvestment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvestmentInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const { data, error } = await supabase
        .from("investments")
        .insert({ ...buildRow(input), owner_id: user.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["investments"] });

      const previousLists = qc.getQueriesData<Investment[]>({ queryKey: ["investments", "list"] });

      const optimistic: Investment = {
        id: localId(),
        owner_id: "",
        created_at: new Date().toISOString(),
        ...buildRow(input),
      };

      for (const [key, list] of previousLists) {
        qc.setQueryData<Investment[]>(key, list ? [optimistic, ...list] : [optimistic]);
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
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}

// Editar una posición existente: re-deriva valores (deriveInvestmentValues) con
// los nuevos datos y la tasa MEP actual, y actualiza la fila. Sin optimistic:
// el edit es menos frecuente y la invalidación refresca al instante.
export function useUpdateInvestment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CreateInvestmentInput }) => {
      const { error } = await supabase
        .from("investments")
        .update(buildRow(input))
        .eq("id", id);
      if (error) throw error;
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
    },
  });
}
