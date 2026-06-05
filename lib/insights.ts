// Lógica pura de "Insights de gastos": tendencia mensual de gasto/ingreso,
// comparación mes contra mes y categorías que más crecieron/bajaron.
// Sin React → unit-testeable con `bun test`.
//
// Multi-moneda (regla #1): además de ARS llevamos el total USD, con la misma
// convención que lib/spending.ts → el USD de un agregado es null si a alguna
// fila que lo compone le falta amount_usd (no inventamos conversión acá).

import { addMonths } from "./projection";

export type TxRow = {
  type: string; // "expense" | "income" | ...
  category: string | null;
  amount_ars: number | null;
  amount_usd: number | null;
  date: string; // "YYYY-MM-DD"
};

export type MonthTotals = {
  period: string; // "YYYY-MM"
  expenseArs: number;
  expenseUsd: number | null;
  incomeArs: number;
  incomeUsd: number | null;
  netArs: number; // ingreso − gasto
};

function period(date: string): string {
  return (date ?? "").slice(0, 7);
}

// Suma un monto USD a un acumulador con null-propagation (null si falta el dato).
function addUsd(acc: number | null, usd: number | null): number | null {
  if (acc == null || usd == null) return null;
  return acc + usd;
}

// Período "YYYY-MM" desplazado n meses (n negativo = hacia atrás).
export function shiftPeriod(p: string, n: number): string {
  return addMonths(p, n).slice(0, 7);
}

export function previousPeriod(p: string): string {
  return shiftPeriod(p, -1);
}

// Serie de los últimos `months` períodos terminando en `endPeriod` (inclusive),
// rellenando con ceros los meses sin movimientos para que el gráfico sea continuo.
export function monthlyTotals(rows: TxRow[], endPeriod: string, months: number): MonthTotals[] {
  type Acc = { expenseArs: number; expenseUsd: number | null; incomeArs: number; incomeUsd: number | null };
  const acc = new Map<string, Acc>();
  for (const r of rows) {
    const p = period(r.date);
    const cur = acc.get(p) ?? { expenseArs: 0, expenseUsd: 0, incomeArs: 0, incomeUsd: 0 };
    const ars = Number(r.amount_ars ?? 0);
    const usd = r.amount_usd != null ? Number(r.amount_usd) : null;
    if (r.type === "expense") {
      cur.expenseArs += ars;
      cur.expenseUsd = addUsd(cur.expenseUsd, usd);
    } else if (r.type === "income") {
      cur.incomeArs += ars;
      cur.incomeUsd = addUsd(cur.incomeUsd, usd);
    }
    acc.set(p, cur);
  }

  const out: MonthTotals[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const p = shiftPeriod(endPeriod, -i);
    const v = acc.get(p) ?? { expenseArs: 0, expenseUsd: 0, incomeArs: 0, incomeUsd: 0 };
    out.push({
      period: p,
      expenseArs: v.expenseArs,
      expenseUsd: v.expenseUsd,
      incomeArs: v.incomeArs,
      incomeUsd: v.incomeUsd,
      netArs: v.incomeArs - v.expenseArs,
    });
  }
  return out;
}

export type CategoryDelta = {
  category: string; // id de lib/categories (o "other" si viene null)
  current: number; // gasto ARS del período actual
  currentUsd: number | null;
  previous: number; // gasto ARS del período anterior
  deltaAbs: number; // current − previous
  deltaPct: number | null; // null si previous == 0 (no se puede calcular %)
};

function expenseByCategory(rows: TxRow[], p: string): Map<string, { ars: number; usd: number | null }> {
  const m = new Map<string, { ars: number; usd: number | null }>();
  for (const r of rows) {
    if (r.type !== "expense") continue;
    if (period(r.date) !== p) continue;
    const cat = r.category ?? "other";
    const usd = r.amount_usd != null ? Number(r.amount_usd) : null;
    const acc = m.get(cat) ?? { ars: 0, usd: 0 as number | null };
    acc.ars += Number(r.amount_ars ?? 0);
    acc.usd = addUsd(acc.usd, usd);
    m.set(cat, acc);
  }
  return m;
}

// Compara el gasto por categoría entre dos períodos. Incluye categorías que
// aparecen en cualquiera de los dos. Ordena por mayor crecimiento absoluto.
export function categoryMovers(rows: TxRow[], current: string, prev: string): CategoryDelta[] {
  const cur = expenseByCategory(rows, current);
  const old = expenseByCategory(rows, prev);
  const cats = new Set<string>([...cur.keys(), ...old.keys()]);

  const out: CategoryDelta[] = [];
  for (const category of cats) {
    const c = cur.get(category) ?? { ars: 0, usd: null };
    const p = old.get(category)?.ars ?? 0;
    out.push({
      category,
      current: c.ars,
      currentUsd: c.usd,
      previous: p,
      deltaAbs: c.ars - p,
      deltaPct: p > 0 ? ((c.ars - p) / p) * 100 : null,
    });
  }
  return out.sort((a, b) => b.deltaAbs - a.deltaAbs);
}

export type SpendTrend = {
  current: number; // gasto ARS del mes actual
  currentUsd: number | null;
  previous: number; // gasto ARS del mes anterior
  previousUsd: number | null;
  deltaAbs: number;
  deltaPct: number | null;
  avgArs: number; // promedio de gasto de la serie
};

// Resumen de la tendencia de gasto sobre una serie de MonthTotals (el último
// elemento es el mes actual). Compara contra el mes anterior y el promedio.
export function spendTrend(series: MonthTotals[]): SpendTrend | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  const prev = series.length >= 2 ? series[series.length - 2] : null;
  const previous = prev?.expenseArs ?? 0;
  const avg = series.reduce((s, m) => s + m.expenseArs, 0) / series.length;
  return {
    current: last.expenseArs,
    currentUsd: last.expenseUsd,
    previous,
    previousUsd: prev?.expenseUsd ?? null,
    deltaAbs: last.expenseArs - previous,
    deltaPct: previous > 0 ? ((last.expenseArs - previous) / previous) * 100 : null,
    avgArs: avg,
  };
}
