import { describe, expect, it } from "bun:test";
import {
  categoryMovers,
  monthlyTotals,
  previousPeriod,
  shiftPeriod,
  spendTrend,
  type TxRow,
} from "./insights";

function tx(over: Partial<TxRow> & { date: string; amount_ars: number }): TxRow {
  return {
    type: "expense",
    category: "food",
    amount_usd: null,
    ...over,
  };
}

describe("period helpers", () => {
  it("shiftPeriod va hacia atrás y adelante cruzando años", () => {
    expect(shiftPeriod("2026-06", -1)).toBe("2026-05");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2025-12", 1)).toBe("2026-01");
  });
  it("previousPeriod", () => {
    expect(previousPeriod("2026-06")).toBe("2026-05");
  });
});

describe("monthlyTotals", () => {
  const rows: TxRow[] = [
    tx({ date: "2026-06-03", amount_ars: 100, type: "expense" }),
    tx({ date: "2026-06-10", amount_ars: 50, type: "expense" }),
    tx({ date: "2026-06-15", amount_ars: 300, type: "income" }),
    tx({ date: "2026-05-20", amount_ars: 80, type: "expense" }),
  ];

  it("rellena meses sin movimientos con cero y respeta el orden", () => {
    const s = monthlyTotals(rows, "2026-06", 3);
    expect(s.map((m) => m.period)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(s[0]).toMatchObject({ expenseArs: 0, incomeArs: 0, netArs: 0 });
    expect(s[1].expenseArs).toBe(80);
    expect(s[2].expenseArs).toBe(150);
    expect(s[2].incomeArs).toBe(300);
    expect(s[2].netArs).toBe(150); // 300 ingreso − 150 gasto
  });

  it("ignora tipos que no son expense/income", () => {
    const s = monthlyTotals([tx({ date: "2026-06-01", amount_ars: 999, type: "transfer" })], "2026-06", 1);
    expect(s[0].expenseArs).toBe(0);
    expect(s[0].incomeArs).toBe(0);
  });

  it("USD se anula si a alguna fila del grupo le falta el dato", () => {
    const s = monthlyTotals(
      [
        tx({ date: "2026-06-01", amount_ars: 100, amount_usd: 1, type: "expense" }),
        tx({ date: "2026-06-02", amount_ars: 100, amount_usd: null, type: "expense" }),
      ],
      "2026-06",
      1,
    );
    expect(s[0].expenseArs).toBe(200);
    expect(s[0].expenseUsd).toBeNull();
  });

  it("USD se suma si todas las filas lo tienen", () => {
    const s = monthlyTotals(
      [
        tx({ date: "2026-06-01", amount_ars: 100, amount_usd: 1, type: "expense" }),
        tx({ date: "2026-06-02", amount_ars: 100, amount_usd: 2, type: "expense" }),
      ],
      "2026-06",
      1,
    );
    expect(s[0].expenseUsd).toBe(3);
  });
});

describe("categoryMovers", () => {
  const rows: TxRow[] = [
    tx({ date: "2026-06-01", amount_ars: 300, category: "food" }),
    tx({ date: "2026-05-01", amount_ars: 100, category: "food" }),
    tx({ date: "2026-06-01", amount_ars: 200, category: "transport" }), // nueva
    tx({ date: "2026-05-01", amount_ars: 500, category: "entertainment" }), // desaparece
  ];

  it("ordena por crecimiento absoluto y calcula %; el que más bajó queda último", () => {
    const movers = categoryMovers(rows, "2026-06", "2026-05");
    // food y transport empatan en +200 → ambos arriba; entertainment (-500) último.
    expect(movers.slice(0, 2).map((m) => m.category).sort()).toEqual(["food", "transport"]);
    expect(movers[movers.length - 1].category).toBe("entertainment");

    const transport = movers.find((m) => m.category === "transport")!;
    expect(transport.deltaAbs).toBe(200);
    expect(transport.deltaPct).toBeNull(); // previous 0 (categoría nueva) → sin %

    const food = movers.find((m) => m.category === "food")!;
    expect(food.deltaAbs).toBe(200);
    expect(food.deltaPct).toBe(200); // 100 → 300 = +200%

    const ent = movers.find((m) => m.category === "entertainment")!;
    expect(ent.deltaAbs).toBe(-500); // bajó a 0
    expect(ent.current).toBe(0);
  });
});

describe("spendTrend", () => {
  it("compara el último mes contra el anterior y el promedio", () => {
    const series = monthlyTotals(
      [
        tx({ date: "2026-04-01", amount_ars: 100, type: "expense" }),
        tx({ date: "2026-05-01", amount_ars: 200, type: "expense" }),
        tx({ date: "2026-06-01", amount_ars: 300, type: "expense" }),
      ],
      "2026-06",
      3,
    );
    const t = spendTrend(series)!;
    expect(t.current).toBe(300);
    expect(t.previous).toBe(200);
    expect(t.deltaAbs).toBe(100);
    expect(t.deltaPct).toBe(50);
    expect(t.avgArs).toBe(200);
  });

  it("devuelve null sin serie", () => {
    expect(spendTrend([])).toBeNull();
  });
});
