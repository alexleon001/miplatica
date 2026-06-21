// Preferencia de apariencia del rediseño "Línea": tema (esmeralda/terracota) +
// modo (claro/oscuro/auto). Local-first (Zustand + AsyncStorage), igual que el
// resto de los stores. La consume lib/theme-context para resolver la paleta viva.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppearanceMode, ThemeName } from "../theme-tokens";

type AppearanceState = {
  theme: ThemeName;
  mode: AppearanceMode;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: AppearanceMode) => void;
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      theme: "esmeralda",
      mode: "dark",
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "mp-appearance",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
