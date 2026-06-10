// Estado Pro del usuario (Sprint 10: monetización). La IA es Pro; este hook es la
// fuente única para gatear las features de IA en el cliente. La verdad vive
// server-side: la función SQL is_pro() lee la tabla `entitlements` (que escribe el
// webhook de RevenueCat). El cliente solo lo refleja para la UX; las Edge Functions
// re-verifican igual (no se confía en el cliente).
//
// En __DEV__, un override local (useProDevStore) tiene prioridad para poder probar
// el camino Pro/Free sin RevenueCat cableado.

import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../query-client";
import { supabase } from "../supabase";
import { useProDevStore } from "../store/pro";

async function fetchIsPro(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_pro");
  // Si la función falla (red, migración faltante en otro entorno), fallamos
  // CERRADO: tratamos al usuario como Free (no desbloquea IA por error).
  if (error) return false;
  return data === true;
}

export function usePro(): { isPro: boolean; isLoading: boolean } {
  const devOverride = useProDevStore((s) => s.devOverride);

  const query = useQuery({
    queryKey: ["entitlement", "is-pro"],
    queryFn: fetchIsPro,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });

  if (__DEV__ && devOverride != null) {
    return { isPro: devOverride, isLoading: false };
  }
  return { isPro: query.data === true, isLoading: query.isLoading };
}

// Refresca el entitlement tras una compra/restauración. El que escribe la DB es
// el webhook de RevenueCat y puede tardar unos segundos en llegar, así que
// además de invalidar ya, reintenta dos veces más.
export function refreshProSoon(): void {
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["entitlement", "is-pro"] });
  void invalidate();
  setTimeout(invalidate, 4000);
  setTimeout(invalidate, 12000);
}
