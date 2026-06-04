// Plantillas de gastos/ingresos recurrentes, persistidas local (AsyncStorage).
// El usuario marca "repetir todos los meses" al crear un movimiento; un banner en
// Movimientos las registra cada mes y una lista en "Más" permite borrarlas.
// Local por dispositivo (sin backend), igual que el resto de los stores.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { currentPeriod, type RecurringTemplate } from "../recurring";

function id(): string {
  return `rec-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

type RecurringState = {
  templates: RecurringTemplate[];
  // Alta: se crea ya marcada como registrada en el mes actual (recién creada),
  // así no se vuelve a sugerir hasta el mes que viene.
  add: (t: Omit<RecurringTemplate, "id" | "lastRegisteredPeriod">) => void;
  remove: (templateId: string) => void;
  markRegistered: (templateId: string, period: string) => void;
};

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set) => ({
      templates: [],
      add: (t) =>
        set((s) => ({
          templates: [...s.templates, { ...t, id: id(), lastRegisteredPeriod: currentPeriod() }],
        })),
      remove: (templateId) =>
        set((s) => ({ templates: s.templates.filter((x) => x.id !== templateId) })),
      markRegistered: (templateId, period) =>
        set((s) => ({
          templates: s.templates.map((x) =>
            x.id === templateId ? { ...x, lastRegisteredPeriod: period } : x,
          ),
        })),
    }),
    {
      name: "mi-platica.recurring",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
