// Historial del chat del asesor IA, persistido en AsyncStorage para que NO se
// pierda al salir de la pantalla o cerrar la app. Conversación única (v1):
// guarda la lista completa de mensajes; "Limpiar" arranca una nueva.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AdvisorMessage } from "../hooks/use-advisor";

type AdvisorChatState = {
  messages: AdvisorMessage[];
  setMessages: (messages: AdvisorMessage[]) => void;
  clear: () => void;
};

export const useAdvisorChatStore = create<AdvisorChatState>()(
  persist(
    (set) => ({
      messages: [],
      setMessages: (messages) => set({ messages }),
      clear: () => set({ messages: [] }),
    }),
    {
      name: "mi-platica.advisor-chat",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
