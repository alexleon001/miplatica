// Estado global del selector de moneda y tipo de cambio.
// Regla #1 del proyecto: nunca mostrar solo ARS — siempre ofrecer USD.
// Este store decide en qué moneda renderiza el resto de la app
// y qué tipo de cambio usa para convertir.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CurrencyDisplay = "ars" | "usd" | "both";
export type UsdType = "mep" | "blue" | "oficial" | "ccl" | "tarjeta";

type CurrencyState = {
  display: CurrencyDisplay;
  usdType: UsdType;
  setDisplay: (display: CurrencyDisplay) => void;
  setUsdType: (usdType: UsdType) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      display: "both",
      usdType: "mep",
      setDisplay: (display) => set({ display }),
      setUsdType: (usdType) => set({ usdType }),
    }),
    {
      name: "mi-platica.currency",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
