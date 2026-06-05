// Alertas de cotización del dólar, persistidas local (AsyncStorage). El usuario
// las crea/borra desde "Más → Alertas de cotización". El flag `triggered` (estado
// del edge-trigger) también vive acá: lo actualiza el hook use-rate-alerts tras
// cada evaluación. Local por dispositivo (sin backend), como el resto de stores.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RateAlertConfig, RateDirection, RateType } from "../rate-alerts";

function id(): string {
  return `rate-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

type RateAlertsState = {
  alerts: RateAlertConfig[];
  add: (rate: RateType, direction: RateDirection, threshold: number) => void;
  remove: (alertId: string) => void;
  // Aplica el próximo estado `triggered` devuelto por evaluateRateAlerts.
  applyTriggered: (next: Record<string, boolean>) => void;
};

export const useRateAlertsStore = create<RateAlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      add: (rate, direction, threshold) =>
        set((s) => ({
          alerts: [...s.alerts, { id: id(), rate, direction, threshold, triggered: false }],
        })),
      remove: (alertId) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== alertId) })),
      applyTriggered: (next) =>
        set((s) => {
          // Conservar la MISMA referencia del array si ningún flag cambió: así el
          // hook que depende de `alerts` no re-renderiza en loop (evaluate →
          // applyTriggered → render → evaluate…).
          let changed = false;
          const alerts = s.alerts.map((a) => {
            if (a.id in next && next[a.id] !== a.triggered) {
              changed = true;
              return { ...a, triggered: next[a.id] };
            }
            return a;
          });
          return changed ? { alerts } : s;
        }),
    }),
    {
      name: "mi-platica.rate-alerts",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
