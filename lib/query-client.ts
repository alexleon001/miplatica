import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Argentina = conectividad inconsistente: damos margen para servir cache
      // mientras revalidamos en background.
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 60 * 24, // 24 h (cache local)
      retry: 2,
      refetchOnWindowFocus: false, // no aplica en RN, pero por las dudas
    },
  },
});
