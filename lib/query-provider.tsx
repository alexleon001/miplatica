import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "./query-client";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "mi-platica.queries",
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 h
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
