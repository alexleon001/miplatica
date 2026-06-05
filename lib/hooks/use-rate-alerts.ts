// Dispara notificaciones locales cuando la cotización del dólar cruza un umbral
// configurado por el usuario. Event-driven, igual que use-budget-alerts: cuando
// cambia la cotización (useExchangeRates), evaluamos las alertas armadas y
// presentamos las nuevas al instante. El estado del edge-trigger se persiste en
// el store (applyTriggered) para no re-notificar ni perder el re-armado.
//
// Notificación inmediata (trigger null) → no entra en el set de "scheduled", así
// que NO la pisa el cancelAllScheduledNotificationsAsync de use-reminders-sync.

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useExchangeRates } from "./use-exchange-rates";
import { useRateAlertsStore } from "../store/rate-alerts";
import { useNotifPrefsStore } from "../store/notif-prefs";
import { evaluateRateAlerts, rateAlertBody, type RatesSnapshot } from "../rate-alerts";

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export function useRateAlerts() {
  const { data: rates } = useExchangeRates();
  const alerts = useRateAlertsStore((s) => s.alerts);
  const applyTriggered = useRateAlertsStore((s) => s.applyTriggered);
  const enabled = useNotifPrefsStore((s) => s.rateAlerts);
  const running = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !enabled || !rates || alerts.length === 0) return;
    if (running.current) return;
    running.current = true;

    (async () => {
      try {
        const snapshot: RatesSnapshot = {
          oficial: rates.oficial,
          mep: rates.mep,
          blue: rates.blue,
          ccl: rates.ccl,
        };
        const { fired, nextState } = evaluateRateAlerts(alerts, snapshot);

        // Siempre persistimos el próximo estado (incluye re-armados), aunque no
        // haya nada que notificar.
        applyTriggered(nextState);
        if (fired.length === 0) return;

        const ok = await ensurePermission();
        if (!ok) return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("rates", {
            name: "Cotización del dólar",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        for (const a of fired) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "💵 Alerta de cotización",
              body: rateAlertBody(a),
              data: { kind: "rate" },
            },
            trigger: Platform.OS === "android" ? ({ channelId: "rates" } as any) : null,
          });
        }
      } catch {
        // best-effort: si falla, no rompemos la app.
      } finally {
        running.current = false;
      }
    })();
  }, [rates, alerts, enabled]);
}
