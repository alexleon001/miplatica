// Historial de patrimonio neto persistido local (AsyncStorage). Un snapshot por
// día: el dashboard llama `record` cuando carga el patrimonio fresco, y el
// mini-gráfico lee `points`. Local por dispositivo (sin backend/cron), igual que
// el resto de los stores locales (asesor, alertas, pagado de proyección).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { upsertSnapshot, type NetWorthSnapshot } from "../networth-history";

function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type NetWorthHistoryState = {
  points: NetWorthSnapshot[];
  record: (ars: number, usd: number | null) => void;
};

export const useNetWorthHistoryStore = create<NetWorthHistoryState>()(
  persist(
    (set) => ({
      points: [],
      record: (ars, usd) =>
        set((s) => ({ points: upsertSnapshot(s.points, { date: todayKey(), ars, usd }) })),
    }),
    {
      name: "mi-platica.networth-history",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
