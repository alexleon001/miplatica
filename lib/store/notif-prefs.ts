// Preferencias de notificaciones locales, persistidas (AsyncStorage). El usuario
// puede apagar cada fuente desde "Más". Las leen los hooks que agendan/disparan:
// useRemindersSync (vencimientos) y useBudgetAlerts (presupuestos). Default: on.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type NotifPrefsState = {
  reminders: boolean; // vencimientos de deudas/metas
  budgetAlerts: boolean; // 80%/100% de presupuesto
  rateAlerts: boolean; // umbrales de cotización del dólar
  setReminders: (v: boolean) => void;
  setBudgetAlerts: (v: boolean) => void;
  setRateAlerts: (v: boolean) => void;
};

export const useNotifPrefsStore = create<NotifPrefsState>()(
  persist(
    (set) => ({
      reminders: true,
      budgetAlerts: true,
      rateAlerts: true,
      setReminders: (v) => set({ reminders: v }),
      setBudgetAlerts: (v) => set({ budgetAlerts: v }),
      setRateAlerts: (v) => set({ rateAlerts: v }),
    }),
    {
      name: "mi-platica.notif-prefs",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
