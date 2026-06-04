// Programa notificaciones locales para los vencimientos de deudas y metas.
// Se ejecuta cuando cambian los datos: pide permiso una vez, cancela las
// notificaciones previas y reprograma según el estado actual.
//
// Las notificaciones locales NO requieren backend ni push tokens; funcionan
// offline en el APK standalone. (En Expo Go el soporte es limitado.)

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useDebts } from "./use-debts";
import { useSavingsGoals } from "./use-savings-goals";
import { buildReminders, reminderBody, reminderFireDate, type ReminderKind } from "../reminders";
import { useNotifPrefsStore } from "../store/notif-prefs";

// Al tocar una notificación de recordatorio, abrir la pantalla relevante:
// deudas → tab Deudas; metas → "Más" (donde vive la lista de metas).
function routeForKind(kind: ReminderKind): "/(tabs)/debts" | "/(tabs)/more" {
  return kind === "debt" ? "/(tabs)/debts" : "/(tabs)/more";
}

// Cómo mostrar una notificación si la app está en foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export function useRemindersSync() {
  const debts = useDebts();
  const goals = useSavingsGoals();
  const router = useRouter();
  const remindersEnabled = useNotifPrefsStore((s) => s.reminders);
  const syncing = useRef(false);

  // Deep-link: navegar al tocar la notificación (y si la app se abrió desde una).
  useEffect(() => {
    if (Platform.OS === "web") return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      const kind = response?.notification.request.content.data?.kind as ReminderKind | undefined;
      if (kind === "debt" || kind === "goal") router.push(routeForKind(kind));
    };

    // Caso: la app se abrió tocando una notificación (estaba cerrada).
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    // Caso: la app ya estaba abierta / en background.
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!debts.data || !goals.data) return;
    if (syncing.current) return;
    syncing.current = true;

    (async () => {
      try {
        // Apagado por el usuario: limpiamos lo que hubiéramos agendado y salimos.
        if (!remindersEnabled) {
          await Notifications.cancelAllScheduledNotificationsAsync();
          return;
        }

        const ok = await ensurePermission();
        if (!ok) return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("reminders", {
            name: "Recordatorios",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        // Reprogramar limpio: cancelamos todo lo nuestro y volvemos a agendar.
        await Notifications.cancelAllScheduledNotificationsAsync();

        const reminders = buildReminders(debts.data!, goals.data!);
        for (const r of reminders) {
          const fireDate = reminderFireDate(r.date);
          if (!fireDate) continue; // vencido → solo aviso in-app

          await Notifications.scheduleNotificationAsync({
            identifier: r.id,
            content: {
              title: r.kind === "debt" ? "💳 Vence un pago" : "🎯 Meta de ahorro",
              body: reminderBody(r),
              data: { kind: r.kind },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fireDate,
              channelId: "reminders",
            },
          });
        }
      } catch {
        // best-effort: si falla el scheduling no rompemos la app.
      } finally {
        syncing.current = false;
      }
    })();
  }, [debts.data, goals.data, remindersEnabled]);
}
