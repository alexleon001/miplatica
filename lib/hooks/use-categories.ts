// Hook reactivo para los selectores de categoría (chips de add-transaction /
// add-budget). Mergea las built-in (lib/categories) con las custom del usuario
// (store local) y re-renderiza cuando el usuario crea/borra una custom.
// Para resolver una categoría por id en listas/desglose se usa categoryById
// directamente (lo alimenta el registry, no hace falta este hook).

import { useMemo } from "react";
import { CATEGORIES, type Category, type CategoryGroup } from "../categories";
import { useCustomCategoriesStore } from "../store/custom-categories";

export function useCategoriesByGroup(group: CategoryGroup): Category[] {
  const custom = useCustomCategoriesStore((s) => s.categories);
  return useMemo(
    () => [
      ...CATEGORIES.filter((c) => c.group === group),
      ...custom.filter((c) => c.group === group),
    ],
    [group, custom],
  );
}
