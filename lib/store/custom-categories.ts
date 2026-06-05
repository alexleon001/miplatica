// Categorías personalizadas del usuario, persistidas local (AsyncStorage).
// Local por dispositivo, como el resto de los stores (sin migración a la DB).
// Cada cambio (y la rehidratación) registra la lista en lib/categories vía
// registerCustomCategories para que categoryById las resuelva en toda la app.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { registerCustomCategories, type Category } from "../categories";

function id(): string {
  return `cat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// Las custom sólo pueden ser de gasto o ingreso (los grupos que el usuario
// categoriza a mano).
export type CustomCategoryInput = {
  label: string;
  icon: string;
  color: string;
  group: "expense" | "income";
};

type CustomCategoriesState = {
  categories: Category[];
  add: (input: CustomCategoryInput) => void;
  remove: (categoryId: string) => void;
};

export const useCustomCategoriesStore = create<CustomCategoriesState>()(
  persist(
    (set) => ({
      categories: [],
      add: (input) =>
        set((s) => {
          const next = [...s.categories, { ...input, id: id() }];
          registerCustomCategories(next);
          return { categories: next };
        }),
      remove: (categoryId) =>
        set((s) => {
          const next = s.categories.filter((c) => c.id !== categoryId);
          registerCustomCategories(next);
          return { categories: next };
        }),
    }),
    {
      name: "mi-platica.custom-categories",
      storage: createJSONStorage(() => AsyncStorage),
      // Al rehidratar, registramos lo persistido para que categoryById resuelva
      // las custom apenas arranca la app.
      onRehydrateStorage: () => (state) => {
        if (state) registerCustomCategories(state.categories);
      },
    },
  ),
);
