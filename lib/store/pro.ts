// Override LOCAL de Pro, solo para desarrollo/QA (Sprint 10: monetización). La
// fuente de verdad real del entitlement es server-side (tabla `entitlements`,
// escrita por el webhook de RevenueCat en Fase 2) y se lee con usePro(). Mientras
// RevenueCat no esté cableado, este override permite probar el camino Pro/Free.
//
// IMPORTANTE: usePro() solo respeta este override cuando __DEV__ es true → no es un
// backdoor en producción.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProDevState = {
  // null = sin override (usar el entitlement real); true/false = forzar en dev.
  devOverride: boolean | null;
  setDevOverride: (v: boolean | null) => void;
};

export const useProDevStore = create<ProDevState>()(
  persist(
    (set) => ({
      devOverride: null,
      setDevOverride: (v) => set({ devOverride: v }),
    }),
    {
      name: "mi-platica.pro-dev",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
