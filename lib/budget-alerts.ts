// Lógica pura de alertas de presupuesto. Decide qué presupuestos cruzaron un
// umbral (80% aviso / 100% excedido) y todavía NO fueron notificados este mes.
// Sin React → unit-testeable con `bun test`.
//
// El dedup es por clave estable `${budgetId}:${level}:${YYYY-MM}`: un mismo
// presupuesto puede disparar primero "warn" y luego "over" (claves distintas),
// pero no re-notifica el mismo nivel dos veces en el mismo período.

export type BudgetRow = {
  id: string;
  category: string;
  spent_ars: number;
  limit_ars: number;
  year: number;
  month: number;
};

export type BudgetAlertLevel = "warn" | "over";

export type BudgetAlert = {
  key: string; // `${id}:${level}:${YYYY-MM}` — clave de dedup
  level: BudgetAlertLevel;
  category: string;
  spent: number;
  limit: number;
  pct: number;
};

export const WARN_PCT = 80;

function periodOf(b: BudgetRow): string {
  return `${b.year}-${String(b.month).padStart(2, "0")}`;
}

// Presupuestos que cruzaron un umbral y no están en `notified`. Para cada uno
// devuelve el nivel MÁS alto aún no avisado (over tiene prioridad sobre warn).
export function budgetAlerts(budgets: BudgetRow[], notified: string[]): BudgetAlert[] {
  const seen = new Set(notified);
  const out: BudgetAlert[] = [];

  for (const b of budgets) {
    if (b.limit_ars <= 0) continue;
    const pct = (b.spent_ars / b.limit_ars) * 100;
    const level: BudgetAlertLevel | null = pct >= 100 ? "over" : pct >= WARN_PCT ? "warn" : null;
    if (!level) continue;

    const key = `${b.id}:${level}:${periodOf(b)}`;
    if (seen.has(key)) continue;

    out.push({ key, level, category: b.category, spent: b.spent_ars, limit: b.limit_ars, pct });
  }

  return out;
}

// Conserva sólo las claves del período actual para que el set de dedup no crezca
// sin límite mes a mes.
export function pruneNotified(notified: string[], currentPeriod: string): string[] {
  return notified.filter((k) => k.endsWith(`:${currentPeriod}`));
}

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export type BudgetRisk = {
  category: string;
  pct: number;
  spent: number;
  limit: number;
  over: boolean; // true si superó el 100%
};

// Presupuestos del período en o por encima del umbral de aviso (≥80%), para el
// banner in-app del dashboard. Ordenados de mayor a menor consumo.
export function budgetsAtRisk(budgets: BudgetRow[], period: string): BudgetRisk[] {
  return budgets
    .filter((b) => b.limit_ars > 0 && periodOf(b) === period)
    .map((b) => {
      const pct = (b.spent_ars / b.limit_ars) * 100;
      return { category: b.category, pct, spent: b.spent_ars, limit: b.limit_ars, over: pct >= 100 };
    })
    .filter((r) => r.pct >= WARN_PCT)
    .sort((a, b) => b.pct - a.pct);
}
