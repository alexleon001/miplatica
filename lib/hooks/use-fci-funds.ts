// Lista de FCI (con su VCP del último día) desde argentinadatos, sin auth.
// Combina las 4 categorías en una sola lista deduplicada por slug. Se usa para:
//   - el selector de fondos en add-investment (FundField)
//   - refrescar el valor de las posiciones FCI al vuelo (freshenFci)
// Cache largo (los VCP se publican 1 vez al día).

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FCI_CATEGORIES, type FciCategory, type FciFund, parseFciRow } from "../fci";

const BASE = "https://api.argentinadatos.com/v1/finanzas/fci";

async function fetchCategory(category: FciCategory): Promise<FciFund[]> {
  const res = await fetch(`${BASE}/${category}/ultimo`);
  if (!res.ok) throw new Error(`FCI ${category}: HTTP ${res.status}`);
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => parseFciRow(r, category)).filter((f): f is FciFund => f != null);
}

// `enabled`: solo dispara el fetch cuando hace falta (hay posiciones FCI, o el
// usuario está cargando un FCI). Evita el pedido de red + sort al montar pantallas
// que no lo usan.
export function useFciFunds(enabled = true) {
  return useQuery({
    queryKey: ["fci_funds"],
    enabled,
    staleTime: 1000 * 60 * 60 * 6, // 6 h (VCP es diario)
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<FciFund[]> => {
      // Tolerante a fallos: si una categoría falla, seguimos con las demás.
      const settled = await Promise.allSettled(FCI_CATEGORIES.map((c) => fetchCategory(c.id)));
      const map = new Map<string, FciFund>();
      for (const s of settled) {
        if (s.status !== "fulfilled") continue;
        for (const f of s.value) if (!map.has(f.slug)) map.set(f.slug, f);
      }
      return [...map.values()].sort((a, b) => a.fondo.localeCompare(b.fondo, "es"));
    },
  });
}

// Mapa slug → fondo, para resolver el VCP actual de una posición FCI guardada.
export function useFciFundsBySlug(enabled = true): Map<string, FciFund> {
  const { data } = useFciFunds(enabled);
  return useMemo(() => {
    const m = new Map<string, FciFund>();
    for (const f of data ?? []) m.set(f.slug, f);
    return m;
  }, [data]);
}
