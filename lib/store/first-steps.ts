// Estado del card "Primeros pasos" del dashboard (activación de usuario nuevo).
// Solo persiste si el usuario lo descartó a mano; el resto (qué pasos están
// hechos) se deriva de los datos en vivo. El card se auto-oculta al completar
// todos los pasos, así que no hace falta marcar "completado" acá.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FirstStepsState = {
  dismissed: boolean;
  dismiss: () => void;
};

export const useFirstStepsStore = create<FirstStepsState>()(
  persist(
    (set) => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true }),
    }),
    {
      name: "mi-platica.first-steps",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
