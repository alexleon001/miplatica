// Tope de frecuencia de interstitials (Sprint 10 Fase 2) — lógica pura,
// testeable con bun. Política: 1 interstitial cada N acciones que califican
// (ej: guardar un movimiento), y nunca dos con menos de MIN_INTERVAL entre sí.
// El contador vuelve a cero después de cada anuncio mostrado.

export const INTERSTITIAL_EVERY_N_EVENTS = 4;
export const INTERSTITIAL_MIN_INTERVAL_MS = 4 * 60_000;

export interface AdFrequency {
  // Acciones que califican desde el último interstitial mostrado.
  events: number;
  // Epoch ms del último interstitial mostrado; null = nunca.
  lastShownAt: number | null;
}

export function interstitialDue(freq: AdFrequency, now: number): boolean {
  if (freq.events < INTERSTITIAL_EVERY_N_EVENTS) return false;
  if (freq.lastShownAt != null && now - freq.lastShownAt < INTERSTITIAL_MIN_INTERVAL_MS) return false;
  return true;
}
