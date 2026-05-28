// Wrapper sobre la Edge Function categorize-transaction. Devuelve mutation
// para llamarla on-demand desde la UI ("Sugerir categoría con IA").

import { useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type CategorizeInput = {
  description: string;
  amount: number;
  currency: string;
  account_name?: string;
};

export type CategorizeResult = {
  category: string;
  subcategory: string | null;
  merchant_normalized: string | null;
  confidence: "high" | "medium" | "low";
  is_recurrent: boolean;
  notes: string | null;
};

export function useCategorizeTransaction() {
  return useMutation({
    mutationFn: async (input: CategorizeInput): Promise<CategorizeResult> => {
      const { data, error } = await supabase.functions.invoke<CategorizeResult>(
        "categorize-transaction",
        { body: input },
      );
      if (error) throw error;
      if (!data) throw new Error("Edge function returned empty response");
      return data;
    },
  });
}
