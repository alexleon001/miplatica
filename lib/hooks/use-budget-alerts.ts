// Dispara notificaciones locales cuando un presupuesto cruza el 80% (aviso) o el
// 100% (excedido). A diferencia de los recordatorios de vencimiento (por fecha),
// esto es event-driven: cuando cambian los datos de budgets, comparamos contra
// lo ya notificado (AsyncStorage) y presentamos las alertas nuevas al instante.
//
// Notificación inmediata (trigger null) → no entra en el set de "scheduled", así
// que NO la pisa el cancelAllScheduledNotificationsAsync de use-reminders-sync.

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBudgets } from "./use-budgets";
import { categoryById } from "../categories";
import { budgetAlerts, currentPeriod, pruneNotified, type BudgetAlert } from "../budget-alerts";
import { useNotifPrefsStore } from "../store/notif-prefs";

const STORAGE_KEY = "mi-platica.budget-alerts-notified.v1";
const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function alertBody(a: BudgetAlert): string {
  const cat = categoryById(a.category);
  const name = cat?.label ?? a.category;
  const spent = money.format(Math.round(a.spent));
  const limit = money.format(Math.round(a.limit));
  return a.level === "over"
    ? `Te pasaste en ${name}: $${spent} de $${limit}.`
    : `Vas al ${Math.round(a.pct)}% en ${name}: $${spent} de $${limit}.`;
}

export function useBudgetAlerts() {
  const { data: budgets } = useBudgets();
  const budgetAlertsEnabled = useNotifPrefsStore((s) => s.budgetAlerts);
  const running = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !budgetAlertsEnabled || !budgets || budgets.length === 0) return;
    if (running.current) return;
    running.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const notified: string[] = raw ? JSON.parse(raw) : [];

        const alerts = budgetAlerts(budgets, notified);
        if (alerts.length === 0) return;

        const ok = await ensurePermission();
        if (!ok) return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("budgets", {
            name: "Presupuestos",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        for (const a of alerts) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: a.level === "over" ? "🚨 Presupuesto excedido" : "📊 Presupuesto al límite",
              body: alertBody(a),
              data: { kind: "budget" },
            },
            trigger: Platform.OS === "android" ? { channelId: "budgets" } as any : null,
          });
        }

        const merged = pruneNotified([...notified, ...alerts.map((a) => a.key)], currentPeriod());
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // best-effort: si falla, no rompemos la app.
      } finally {
        running.current = false;
      }
    })();
  }, [budgets, budgetAlertsEnabled]);
}
