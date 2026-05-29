import { expect, test } from "bun:test";
import type { Debt } from "./hooks/use-debts";
import type { SavingsGoal } from "./hooks/use-savings-goals";
import {
  buildReminders,
  daysUntil,
  reminderBody,
  reminderFireDate,
  upcomingReminders,
} from "./reminders";

const NOW = new Date("2026-05-29T12:00:00");

function debt(overrides: Partial<Debt>): Debt {
  return {
    id: "d1", owner_id: "u", name: "Visa", type: "credit_card", currency: "ARS",
    total_amount: 100000, remaining_amount: 50000, interest_rate: null,
    monthly_payment: 25000, next_payment_date: null, end_date: null, notes: null,
    is_active: true, created_at: NOW.toISOString(), ...overrides,
  } as Debt;
}

function goal(overrides: Partial<SavingsGoal>): SavingsGoal {
  return {
    id: "g1", owner_id: "u", name: "Auto", target_amount: 1_000_000, current_amount: 100_000,
    target_currency: "USD", monthly_contribution: null, target_date: null, notes: null,
    created_at: NOW.toISOString(), ...overrides,
  } as SavingsGoal;
}

test("daysUntil: futuro, hoy y pasado", () => {
  expect(daysUntil("2026-06-05", NOW)).toBe(7);
  expect(daysUntil("2026-05-29", NOW)).toBe(0);
  expect(daysUntil("2026-05-27", NOW)).toBe(-2);
});

test("buildReminders incluye deuda con vencimiento y la ordena por urgencia", () => {
  const rs = buildReminders(
    [debt({ id: "a", next_payment_date: "2026-06-10" }), debt({ id: "b", next_payment_date: "2026-06-01" })],
    [],
    NOW,
  );
  expect(rs.map((r) => r.id)).toEqual(["debt-b", "debt-a"]);
  expect(rs[0].daysUntil).toBe(3);
});

test("buildReminders ignora deuda sin fecha y meta ya cumplida", () => {
  const rs = buildReminders(
    [debt({ next_payment_date: null })],
    [
      goal({ id: "done", target_date: "2026-06-15", current_amount: 1_000_000, target_amount: 1_000_000 }),
      goal({ id: "open", target_date: "2026-06-15", current_amount: 10, target_amount: 1_000_000 }),
    ],
    NOW,
  );
  expect(rs.map((r) => r.id)).toEqual(["goal-open"]);
});

test("upcomingReminders incluye vencidos y filtra los lejanos", () => {
  const rs = buildReminders(
    [
      debt({ id: "over", next_payment_date: "2026-05-20" }), // -9
      debt({ id: "soon", next_payment_date: "2026-06-02" }), //  4
      debt({ id: "far", next_payment_date: "2026-07-30" }),  // 62
    ],
    [],
    NOW,
  );
  const up = upcomingReminders(rs, 14);
  expect(up.map((r) => r.id)).toEqual(["debt-over", "debt-soon"]);
});

test("reminderFireDate: día previo 09:00; null si ya venció", () => {
  const fire = reminderFireDate("2026-06-10", NOW);
  expect(fire?.toISOString().slice(0, 10)).toBe("2026-06-09");
  expect(fire?.getHours()).toBe(9);
  expect(reminderFireDate("2026-05-20", NOW)).toBeNull();
});

test("reminderBody redacta deuda y meta en es-AR", () => {
  const [d] = buildReminders([debt({ name: "Visa", next_payment_date: "2026-05-30", monthly_payment: 25000 })], [], NOW);
  expect(reminderBody(d)).toContain("Visa");
  expect(reminderBody(d)).toContain("vence mañana");

  const [g] = buildReminders([], [goal({ name: "Auto", target_date: "2026-05-29", current_amount: 1, target_amount: 100 })], NOW);
  expect(reminderBody(g)).toContain("vence hoy");
});
