// Lógica pura para marcar precios desactualizados (stale) en la UI.
//
// El cron `update-asset-prices` corre cada 15 min en horario bursátil y
// `refresh_positions()` sella `investments.last_updated` cada vez que aplica un
// precio. Si esa marca quedó vieja (o nula) en un instrumento con cotización
// live, el precio mostrado puede no reflejar el mercado → lo avisamos.
//
// Umbral por defecto: 18 h. Tolera el cierre nocturno y el fin de semana (el
// último precio es el cierre, no un error), pero detecta que el pipeline no
// actualizó en lo que va de la jornada siguiente.

const HOUR_MS = 60 * 60 * 1000;

export function isPriceStale(
  lastUpdated: string | null | undefined,
  now: Date = new Date(),
  maxAgeHours = 18,
): boolean {
  if (!lastUpdated) return true; // nunca se revalorizó
  const t = new Date(lastUpdated).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > maxAgeHours * HOUR_MS;
}

const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

// Etiqueta corta para el aviso: "precio del 12 may" (o "sin precio" si nunca).
export function staleLabel(lastUpdated: string | null | undefined): string {
  if (!lastUpdated) return "sin precio";
  const d = new Date(lastUpdated);
  return Number.isNaN(d.getTime()) ? "sin precio" : `precio del ${dayFmt.format(d)}`;
}
