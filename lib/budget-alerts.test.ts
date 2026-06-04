import { describe, expect, it } from "bun:test";
import { budgetAlerts, currentPeriod, pruneNotified, type BudgetRow } from "./budget-alerts";

function row(over: Partial<BudgetRow> & { spent_ars: number; limit_ars: number }): BudgetRow {
  return {
    id: "b1",
    category: "food",
    year: 2026,
    month: 6,
    ...over,
  };
}

describe("budgetAlerts", () => {
  it("no alerta bajo el 80%", () => {
    expect(budgetAlerts([row({ spent_ars: 79, limit_ars: 100 })], [])).toEqual([]);
  });

  it("alerta 'warn' entre 80% y 100%", () => {
    const a = budgetAlerts([row({ spent_ars: 85, limit_ars: 100 })], []);
    expect(a).toHaveLength(1);
    expect(a[0].level).toBe("warn");
    expect(a[0].key).toBe("b1:warn:2026-06");
  });

  it("alerta 'over' al 100% o más", () => {
    const a = budgetAlerts([row({ spent_ars: 120, limit_ars: 100 })], []);
    expect(a).toHaveLength(1);
    expect(a[0].level).toBe("over");
  });

  it("no re-notifica un nivel ya avisado", () => {
    const notified = ["b1:warn:2026-06"];
    expect(budgetAlerts([row({ spent_ars: 85, limit_ars: 100 })], notified)).toEqual([]);
  });

  it("escala de warn a over como evento nuevo", () => {
    const notified = ["b1:warn:2026-06"]; // ya avisado el 80%
    const a = budgetAlerts([row({ spent_ars: 105, limit_ars: 100 })], notified);
    expect(a).toHaveLength(1);
    expect(a[0].level).toBe("over"); // over es clave distinta → dispara
  });

  it("ignora límite cero o negativo", () => {
    expect(budgetAlerts([row({ spent_ars: 50, limit_ars: 0 })], [])).toEqual([]);
  });

  it("alerta por separado en períodos distintos", () => {
    const notified = ["b1:over:2026-06"];
    const a = budgetAlerts([row({ spent_ars: 120, limit_ars: 100, month: 7 })], notified);
    expect(a[0].key).toBe("b1:over:2026-07");
  });
});

describe("pruneNotified", () => {
  it("conserva sólo el período actual", () => {
    const keys = ["b1:warn:2026-05", "b1:over:2026-06", "b2:warn:2026-06"];
    expect(pruneNotified(keys, "2026-06")).toEqual(["b1:over:2026-06", "b2:warn:2026-06"]);
  });
});

describe("currentPeriod", () => {
  it("formatea YYYY-MM con cero a la izquierda", () => {
    expect(currentPeriod(new Date(2026, 2, 15))).toBe("2026-03");
  });
});
