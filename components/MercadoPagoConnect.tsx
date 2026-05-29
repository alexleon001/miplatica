// Conectar / sincronizar / desconectar Mercado Pago. Vive en la sección "Datos"
// de la pantalla Más. OAuth vía useConnectMp (browser in-app).

import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import {
  useConnectMp,
  useDisconnectMp,
  useMpConnection,
  useSyncMp,
} from "../lib/hooks/use-mp";
import { colors } from "../lib/colors";

// Recomendado por expo-web-browser para cerrar sesiones de auth pendientes.
WebBrowser.maybeCompleteAuthSession();

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function MercadoPagoConnect() {
  const { data: conn, isLoading } = useMpConnection();
  const connect = useConnectMp();
  const sync = useSyncMp();
  const disconnect = useDisconnectMp();

  async function onConnect() {
    try {
      await connect.mutateAsync();
    } catch (e) {
      if (e instanceof Error && e.message === "cancelled") return;
      Alert.alert("Mercado Pago", e instanceof Error ? e.message : "No se pudo conectar.");
    }
  }

  async function onSync() {
    try {
      const r = await sync.mutateAsync();
      Alert.alert(
        "Mercado Pago",
        `Listo: ${r.inserted} movimiento(s) nuevo(s)${r.skipped ? `, ${r.skipped} ya estaban` : ""}.`,
      );
    } catch (e) {
      Alert.alert("Mercado Pago", e instanceof Error ? e.message : "No pude sincronizar.");
    }
  }

  function onDisconnect() {
    Alert.alert("Desconectar Mercado Pago", "¿Seguro? Se borran los tokens guardados.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Desconectar", style: "destructive", onPress: () => disconnect.mutate() },
    ]);
  }

  if (isLoading) return <Text style={styles.muted}>Cargando…</Text>;

  if (!conn) {
    return (
      <Pressable
        style={({ pressed }) => [styles.connectBtn, pressed && { opacity: 0.85 }, connect.isPending && { opacity: 0.5 }]}
        onPress={onConnect}
        disabled={connect.isPending}
      >
        <Text style={styles.connectText}>
          {connect.isPending ? "Conectando…" : "Conectar Mercado Pago"}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.connected}>
      <View style={styles.statusRow}>
        <Text style={styles.statusDot}>🟢</Text>
        <Text style={styles.statusText}>
          Conectado{conn.last_synced_at ? ` · sync ${dateFmt.format(new Date(conn.last_synced_at))}` : " · sin sincronizar aún"}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.syncBtn, pressed && { opacity: 0.85 }, sync.isPending && { opacity: 0.5 }]}
          onPress={onSync}
          disabled={sync.isPending}
        >
          <Text style={styles.syncText}>{sync.isPending ? "Sincronizando…" : "Sincronizar ahora"}</Text>
        </Pressable>
        <Pressable onPress={onDisconnect} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.disconnectText}>Desconectar</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>Trae los pagos que recibís en MP (no la billetera personal completa).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13 },
  connectBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  connectText: { color: colors.primary, fontWeight: "600" },
  connected: { gap: 10 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { fontSize: 12 },
  statusText: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  syncBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  syncText: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  disconnectText: { color: colors.negative, fontSize: 13, fontWeight: "600" },
  note: { color: colors.textMuted, fontSize: 11 },
});
