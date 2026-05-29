// Lógica pura de recordatorios de vencimiento (deudas + metas de ahorro).
// Sin dependencias de React Native → unit-testeable con `bun test`.

import type { Debt } from "./hooks/use-debts";
import type { SavingsGoal } from "./hooks/use-savings-goals";

export type ReminderKind = "debt" | "goal";

export type Reminder = {
  id: string; // estable por entidad: `${kind}-${entityId}` (para identificar notifs)
  kind: ReminderKind;
  title: string;
  date: string; // AAAA-MM-DD
  daysUntil: number; // <0 vencido, 0 hoy
  amount: number | null;
  currency: string | null;
};

// Días calendario entre hoy (medianoche local) y la fecha objetivo.
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

// Arma la lista de recordatorios desde deudas (con próximo vencimiento) y metas
// no cumplidas con fecha objetivo. Ordena del más urgente al menos.
export function buildReminders(
  debts: Debt[],
  goals: SavingsGoal[],
  now: Date = new Date(),
): Reminder[] {
  const out: Reminder[] = [];

  for (const d of debts) {
    if (!d.next_payment_date) continue;
    out.push({
      id: `debt-${d.id}`,
      kind: "debt",
      title: d.name,
      date: d.next_payment_date,
      daysUntil: daysUntil(d.next_payment_date, now),
      amount: d.monthly_payment ?? d.remaining_amount,
      currency: d.currency,
    });
  }

  for (const g of goals) {
    if (!g.target_date) continue;
    if (g.current_amount >= g.target_amount) continue; // ya cumplida
    out.push({
      id: `goal-${g.id}`,
      kind: "goal",
      title: g.name,
      date: g.target_date,
      daysUntil: daysUntil(g.target_date, now),
      amount: g.target_amount,
      currency: g.target_currency,
    });
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

// Recordatorios relevantes para mostrar/notificar: vencidos + los que caen
// dentro de `withinDays`.
export function upcomingReminders(all: Reminder[], withinDays = 14): Reminder[] {
  return all.filter((r) => r.daysUntil <= withinDays);
}

// Momento en que debe dispararse la notificación local: el día anterior al
// vencimiento a las 09:00 locales. Si ya pasó, intenta el mismo día a las 09:00.
// Devuelve null si ambas opciones quedaron en el pasado (vencido → solo in-app).
export function reminderFireDate(dateStr: string, now: Date = new Date()): Date | null {
  const dueAt9 = new Date(`${dateStr}T09:00:00`);
  const leadAt9 = new Date(dueAt9.getTime() - 24 * 60 * 60 * 1000);
  if (leadAt9.getTime() > now.getTime()) return leadAt9;
  if (dueAt9.getTime() > now.getTime()) return dueAt9;
  return null;
}

const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

// Texto del recordatorio (in-app y notificación).
export function reminderBody(r: Reminder): string {
  const amount = r.amount != null ? ` (${money.format(r.amount)} ${r.currency ?? ""})`.trimEnd() : "";
  const when =
    r.daysUntil < 0
      ? `venció hace ${Math.abs(r.daysUntil)} ${Math.abs(r.daysUntil) === 1 ? "día" : "días"}`
      : r.daysUntil === 0
        ? "vence hoy"
        : r.daysUntil === 1
          ? "vence mañana"
          : `vence en ${r.daysUntil} días`;

  return r.kind === "debt"
    ? `${r.title}${amount} ${when}.`
    : `Meta "${r.title}"${amount}: ${when}.`;
}
