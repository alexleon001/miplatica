// Marca de "ya pagué este gasto" por mes, persistida local (AsyncStorage). Es un
// checklist mensual del usuario: no toca la lógica de proyección (lib/projection.ts
// sigue calculando el total completo); la pantalla usa esto para tachar lo pagado
// y mostrar el "restante por pagar". Local por dispositivo (no sincroniza), igual
// que el historial del asesor y el dedup de alertas de presupuesto.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Clave estable por ocurrencia: `${lineId}:${month}` (month = "YYYY-MM-01").
export function paidKey(lineId: string, month: string): string {
  return `${lineId}:${month}`;
}

type ProjectionPaidState = {
  paid: Record<string, true>;
  toggle: (key: string) => void;
  isPaid: (key: string) => boolean;
};

export const useProjectionPaidStore = create<ProjectionPaidState>()(
  persist(
    (set, get) => ({
      paid: {},
      toggle: (key) =>
        set((s) => {
          const next = { ...s.paid };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { paid: next };
        }),
      isPaid: (key) => !!get().paid[key],
    }),
    {
      name: "mi-platica.projection-paid",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
