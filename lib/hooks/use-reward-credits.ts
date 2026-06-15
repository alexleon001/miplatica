// Créditos de IA ganados con rewarded ads (Sprint 10 — puente Free→Pro).
// Un usuario Free puede "comprar" un uso de IA mirando un anuncio rewarded: el
// cliente otorga el crédito server-side (grant_ai_reward_credit) y el portón de
// IA lo consume antes de devolver 402 (consume_ai_reward_credit, migración 0013).
// Este hook refleja los créditos disponibles para gatear la UI y expone la acción
// de ganar uno.
//
// Todo falla CERRADO y OTA-safe: si la migración no está aplicada todavía (tabla
// /funciones inexistentes), si no hay módulo nativo de ads, o si un RPC falla,
// credits=0 y la acción degrada sin romper la app.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../query-client";
import { supabase } from "../supabase";
import { rewardedAdUnitId } from "../ads";
import { showRewardedAd } from "../rewarded";

const CREDITS_KEY = ["ai-reward-credits"] as const;

async function fetchRewardCredits(): Promise<number> {
  const { data, error } = await supabase
    .from("ai_reward_credits")
    .select("credits")
    .maybeSingle();
  // Sin fila, error de red o migración faltante → 0 (fail closed).
  if (error || !data) return 0;
  return data.credits ?? 0;
}

// Refresca el conteo de créditos. La llaman las pantallas tras consumir uno
// (cada llamada de IA descuenta un crédito server-side) para reflejar el saldo.
export function invalidateRewardCredits(): void {
  void queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
}

export type WatchAdResult = "earned" | "dismissed" | "unavailable" | "no_credit";

export function useRewardCredits({ enabled = true }: { enabled?: boolean } = {}) {
  const [watching, setWatching] = useState(false);

  const query = useQuery({
    queryKey: CREDITS_KEY,
    queryFn: fetchRewardCredits,
    enabled,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
  });

  // ¿Hay un bloque rewarded configurado? En production se deja apagado a
  // propósito (sin units reales) → no ofrecemos la opción de mirar un anuncio.
  const adsAvailable = rewardedAdUnitId() != null;

  async function watchAdForCredit(): Promise<WatchAdResult> {
    if (watching) return "unavailable";
    setWatching(true);
    try {
      const outcome = await showRewardedAd();
      if (outcome !== "earned") return outcome; // dismissed | unavailable
      const { data, error } = await supabase.rpc("grant_ai_reward_credit");
      // false = tope diario (3) o acumulado (3) alcanzado, o RPC inexistente.
      if (error || data !== true) return "no_credit";
      invalidateRewardCredits();
      return "earned";
    } finally {
      setWatching(false);
    }
  }

  return {
    credits: query.data ?? 0,
    isLoading: query.isLoading,
    adsAvailable,
    watching,
    watchAdForCredit,
  };
}
