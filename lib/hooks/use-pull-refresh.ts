// Pull-to-refresh genérico: revalida todas las queries activas de TanStack
// Query. Pensado para el patrón de conectividad inconsistente (AR): el usuario
// tira para abajo y fuerza un refetch sin recargar la app.

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function usePullRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  return { refreshing, onRefresh };
}
