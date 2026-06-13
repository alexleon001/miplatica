// Estado persistido del tope de frecuencia de anuncios (local-first). Se
// persiste para que el intervalo mínimo entre interstitials sobreviva a
// reinicios de la app (sesiones móviles son cortas). La decisión de mostrar
// vive en lib/ad-frequency.ts (pura); acá solo el conteo.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AdFrequency } from "../ad-frequency";

type AdFrequencyState = AdFrequency & {
  recordEvent: () => void;
  recordShown: (now: number) => void;
};

export const useAdFrequencyStore = create<AdFrequencyState>()(
  persist(
    (set) => ({
      events: 0,
      lastShownAt: null,
      recordEvent: () => set((s) => ({ events: s.events + 1 })),
      recordShown: (now) => set({ events: 0, lastShownAt: now }),
    }),
    {
      name: "mi-platica.ad-frequency",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
