// Lógica pura del historial de patrimonio neto (para el mini-gráfico del
// dashboard). Sin React → unit-testeable con `bun test`.
//
// Los snapshots se guardan local (un punto por día; ver lib/store/networth-history).
// Acá vive la lógica de inserción/poda y la geometría del sparkline (alturas
// normalizadas con Views, sin libs de charts → OTA-safe).

export type NetWorthSnapshot = {
  date: string; // "YYYY-MM-DD" (un punto por día)
  ars: number;
  usd: number | null;
};

export const MAX_POINTS = 90;

// Inserta/actualiza el snapshot del día y mantiene como mucho `maxPoints` puntos
// (los más recientes), ordenados por fecha ascendente. Idempotente por día:
// re-guardar el mismo día pisa el valor anterior (último del día gana).
export function upsertSnapshot(
  points: NetWorthSnapshot[],
  snap: NetWorthSnapshot,
  maxPoints = MAX_POINTS,
): NetWorthSnapshot[] {
  const rest = points.filter((p) => p.date !== snap.date);
  const next = [...rest, snap].sort((a, b) => a.date.localeCompare(b.date));
  return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
}

export type HistorySummary = {
  first: number;
  last: number;
  deltaAbs: number;
  deltaPct: number | null; // null si el primer valor es 0 (no se puede dividir)
  min: number;
  max: number;
  count: number;
};

// Resumen del período sobre la serie de valores (ya en la moneda elegida).
export function summarize(values: number[]): HistorySummary | null {
  if (values.length === 0) return null;
  const first = values[0];
  const last = values[values.length - 1];
  const deltaAbs = last - first;
  const deltaPct = first !== 0 ? (deltaAbs / Math.abs(first)) * 100 : null;
  return {
    first,
    last,
    deltaAbs,
    deltaPct,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

// Alturas normalizadas 0..1 para dibujar barras. Normaliza entre min y max de la
// serie (así se ve la tendencia aunque los valores sean grandes o negativos).
// `minBarPct` da una altura mínima visible a la barra más baja. Si todos los
// valores son iguales, todas quedan al tope.
export function chartBars(values: number[], minBarPct = 0.08): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) return values.map(() => 1);
  return values.map((v) => minBarPct + (1 - minBarPct) * ((v - min) / span));
}
