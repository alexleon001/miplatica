// Wrapper sobre la Edge Function financial-advisor. Manda el historial de
// mensajes y devuelve la respuesta del asesor. La función arma el contexto
// financiero del usuario server-side (RLS), no hace falta pasarlo desde acá.

import { useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type AdvisorMessage = { role: "user" | "assistant"; content: string };

type AdvisorResponse = { reply: string };

export function useAdvisor() {
  return useMutation({
    mutationFn: async (messages: AdvisorMessage[]): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<AdvisorResponse>(
        "financial-advisor",
        { body: { messages } },
      );
      if (error) throw error;
      if (!data?.reply) throw new Error("El asesor no devolvió respuesta");
      return data.reply;
    },
  });
}
