// Conexión a Mercado Pago (OAuth) + sincronización de movimientos.
//
// Flujo:
//   useConnectMp → invoca mp-oauth-start (con el JWT) → abre la URL de MP en un
//   browser in-app (openAuthSessionAsync) → MP autoriza → el callback (Edge)
//   guarda los tokens cifrados y redirige a `miplatica://mp-connected` → el
//   browser se cierra y refrescamos el estado de conexión.
//   useSyncMp → invoca mp-sync-movements → baja pagos recibidos a transactions.
//
// CAVEAT: MP por OAuth trae pagos RECIBIDOS (cobrador), no la billetera personal
// completa (ver advisor/README).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../supabase";

const RETURN_URL = "miplatica://mp-connected";

export type MpConnection = {
  mp_user_id: string | null;
  connected_at: string;
  last_synced_at: string | null;
};

export function useMpConnection() {
  return useQuery<MpConnection | null>({
    queryKey: ["mp_connection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_connections")
        .select("mp_user_id, connected_at, last_synced_at")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ authUrl: string }>("mp-oauth-start");
      if (error) throw error;
      if (!data?.authUrl) throw new Error("No pude obtener la URL de Mercado Pago.");

      const result = await WebBrowser.openAuthSessionAsync(data.authUrl, RETURN_URL);
      if (result.type !== "success") {
        // El user cerró el browser o canceló.
        throw new Error("cancelled");
      }
      const params = new URL(result.url).searchParams;
      if (params.get("ok") !== "1") {
        throw new Error(params.get("error") ?? "No se pudo conectar Mercado Pago.");
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["mp_connection"] }),
  });
}

export function useSyncMp() {
  const qc = useQueryClient();
  return useMutation<{ inserted: number; skipped: number; fetched: number }>({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mp-sync-movements");
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["mp_connection"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["monthly_balance"] });
      qc.invalidateQueries({ queryKey: ["net_worth"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDisconnectMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");
      // RLS igual restringe a la propia fila; filtramos explícito por el owner.
      const { error } = await supabase.from("mp_connections").delete().eq("owner_id", user.user.id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["mp_connection"] }),
  });
}
