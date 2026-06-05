// Deep-link al tocar una notificación local: lleva a la pantalla relevante según
// el `kind` que cada notificación guarda en su `data`. Cubre todas las fuentes
// (recordatorios, presupuestos, alertas de cotización), no sólo los
// recordatorios — por eso vive en su propio hook montado en el layout de tabs.
//
// Cubre tanto la app abierta/en background (listener) como el caso de abrirla
// tocando la notificación con la app cerrada (getLastNotificationResponseAsync).

import { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter, type Href } from "expo-router";
import * as Notifications from "expo-notifications";

type NotifKind = "debt" | "goal" | "budget" | "rate";

// Pantalla destino por tipo de notificación. Deudas → tab Deudas; metas y
// presupuestos viven en "Más"; alertas de cotización → su pantalla.
const ROUTE: Record<NotifKind, Href> = {
  debt: "/(tabs)/debts",
  goal: "/(tabs)/more",
  budget: "/(tabs)/more",
  rate: "/rate-alerts",
};

export function useNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      const kind = response?.notification.request.content.data?.kind as NotifKind | undefined;
      if (kind && kind in ROUTE) router.push(ROUTE[kind]);
    };

    // App abierta desde una notificación (estaba cerrada).
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    // App abierta / en background.
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [router]);
}
