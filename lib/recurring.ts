// Lógica pura de gastos/ingresos recurrentes (plantillas). Sin React → testeable.
// Las plantillas se guardan local (lib/store/recurring). Cada una recuerda el
// último período en que se registró ("YYYY-MM") para no sugerirla dos veces el
// mismo mes y volver a estar "pendiente" el mes siguiente.

export type RecurringTemplate = {
  id: string;
  accountId: string;
  type: string;
  category: string | null;
  amountArs: number;
  amountUsd: number | null;
  description: string | null;
  lastRegisteredPeriod: string; // "YYYY-MM"
};

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Plantillas que todavía no se registraron en el período dado.
export function pendingTemplates(templates: RecurringTemplate[], period: string): RecurringTemplate[] {
  return templates.filter((t) => t.lastRegisteredPeriod !== period);
}

// Convierte una plantilla en el input para crear la transacción (fecha = hoy).
export function templateToTxInput(t: RecurringTemplate, today: string) {
  return {
    account_id: t.accountId,
    type: t.type,
    category: t.category,
    amount_ars: t.amountArs,
    amount_usd: t.amountUsd,
    description: t.description,
    merchant: null,
    source: "recurring",
    date: today,
  };
}

export function templateLabel(t: RecurringTemplate): string {
  const amount = (t.amountUsd != null ? `US$${t.amountUsd}` : `$${Math.round(t.amountArs).toLocaleString("es-AR")}`);
  return `${t.description?.trim() || "Movimiento"} · ${amount}`;
}
