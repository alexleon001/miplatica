// Estado global del selector de moneda y tipo de cambio.
// Regla #1 del proyecto: nunca mostrar solo ARS — siempre ofrecer USD.
// Este store decide en qué moneda renderiza el resto de la app
// y qué tipo de cambio usa para convertir.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_COUNTRY, type CountryCode, type RateKey } from "../countries";

export type CurrencyDisplay = "ars" | "usd" | "both";
// Tipo de tasa local<->USD. Unión de todos los países (ver lib/countries.ts):
// AR usa mep/blue/oficial/ccl/tarjeta, VE usa bcv/paralelo.
export type UsdType = RateKey;

type CurrencyState = {
  // País del usuario (espejo de profiles.country; lo setea el _layout al cargar
  // el perfil). Decide símbolo de moneda, cotizaciones e instrumentos.
  country: CountryCode;
  display: CurrencyDisplay;
  usdType: UsdType;
  setCountry: (country: CountryCode) => void;
  setDisplay: (display: CurrencyDisplay) => void;
  setUsdType: (usdType: UsdType) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      country: DEFAULT_COUNTRY,
      display: "both",
      usdType: "mep",
      setCountry: (country) => set({ country }),
      setDisplay: (display) => set({ display }),
      setUsdType: (usdType) => set({ usdType }),
    }),
    {
      name: "mi-platica.currency",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
