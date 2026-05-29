// Lógica pura de inflación: inflación acumulada entre dos fechas y rendimiento
// REAL (ajustado por IPC) a partir del rendimiento nominal. Regla #5: todo
// rendimiento histórico se compara contra la inflación.
//
// Sin deps de React/DB para poder testear con `bun test`. El hook `useInflation`
// trae las filas de la tabla `inflation` y las pasa acá.

export type InflationRow = {
  month: string; // primer día del mes ISO, "YYYY-MM-01"
  ipc: number;   // inflación mensual en % (ej: 2.6)
};

// "2026-04-15" / "2026-04-30T..." -> "2026-04-01". Devuelve null si no parsea.
export function monthStart(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[1]}-${m[2]}-01` : null;
}

// Inflación acumulada (compuesta) en % para los meses ESTRICTAMENTE posteriores
// a `fromIso` y hasta (inclusive) el mes de `toIso`. Se excluye el mes de compra
// (parcial) y se compone mes a mes.
//
// Devuelve:
//   - null  si no hay datos de inflación cargados (rows vacío) → la UI oculta el real.
//   - 0     si el período es muy corto / aún no hay meses completos con dato.
//   - >0    inflación acumulada en %.
export function cumulativeInflation(
  rows: InflationRow[],
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
): number | null {
  if (rows.length === 0) return null;
  const from = monthStart(fromIso);
  const to = monthStart(toIso);
  if (!from || !to) return null;

  let factor = 1;
  for (const r of rows) {
    if (r.month > from && r.month <= to && Number.isFinite(r.ipc)) {
      factor *= 1 + r.ipc / 100;
    }
  }
  return (factor - 1) * 100;
}

// Rendimiento real a partir del nominal y la inflación acumulada (ecuación de
// Fisher): (1 + nom) / (1 + infl) - 1. Todo en %.
export function realReturn(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

// Resultado real de una posición: combina la inflación acumulada desde la compra
// con el rendimiento nominal EN PESOS de la posición. El nominal en ARS se deriva
// de profit_loss_ars y el costo (= valor actual − P&L). Responde la pregunta
// relevante en Argentina: "¿le ganó a la inflación, medido en pesos?".
//
// Devuelve null cuando no se puede calcular (sin datos de inflación, sin valor
// ARS, o costo no positivo).
export function realReturnForPosition(
  args: {
    currentValueArs: number | null;
    profitLossArs: number | null;
    since: string | null | undefined; // purchase_date ?? created_at
  },
  rows: InflationRow[],
  todayIso: string,
): { nominalPct: number; realPct: number; inflationPct: number } | null {
  const value = args.currentValueArs;
  const pl = args.profitLossArs;
  if (value == null || pl == null) return null;
  const cost = value - pl;
  if (cost <= 0) return null;

  const inflationPct = cumulativeInflation(rows, args.since, todayIso);
  if (inflationPct == null) return null;

  const nominalPct = (pl / cost) * 100;
  return { nominalPct, realPct: realReturn(nominalPct, inflationPct), inflationPct };
}
