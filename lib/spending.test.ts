import { describe, expect, it } from "bun:test";
import { spendingByCategory, topCategories, type SpendingRow } from "./spending";

const row = (over: Partial<SpendingRow>): SpendingRow => ({
  type: "expense",
  category: "food",
  amount_ars: 100,
  amount_usd: 1,
  date: "2026-06-10",
  ...over,
});

describe("spendingByCategory", () => {
  it("agrupa gastos del período por categoría y calcula %", () => {
    const r = spendingByCategory(
      [
        row({ category: "food", amount_ars: 300 }),
        row({ category: "transport", amount_ars: 100 }),
        row({ category: "food", amount_ars: 100 }),
      ],
      "2026-06",
    );
    expect(r.totalArs).toBe(500);
    expect(r.items[0]).toMatchObject({ category: "food", ars: 400, pct: 80 });
    expect(r.items[1]).toMatchObject({ category: "transport", ars: 100, pct: 20 });
  });

  it("ignora ingresos y otros períodos", () => {
    const r = spendingByCategory(
      [
        row({ amount_ars: 100 }),
        row({ type: "income", amount_ars: 999 }),
        row({ date: "2026-05-10", amount_ars: 999 }),
      ],
      "2026-06",
    );
    expect(r.totalArs).toBe(100);
    expect(r.items).toHaveLength(1);
  });

  it("category null cae en 'other'", () => {
    const r = spendingByCategory([row({ category: null, amount_ars: 50 })], "2026-06");
    expect(r.items[0].category).toBe("other");
  });

  it("USD del grupo es null si falta el dato en alguna fila", () => {
    const r = spendingByCategory(
      [row({ category: "food", amount_usd: 1 }), row({ category: "food", amount_usd: null })],
      "2026-06",
    );
    expect(r.items[0].usd).toBeNull();
    expect(r.totalUsd).toBeNull();
  });
});

describe("topCategories", () => {
  it("agrupa el sobrante en 'other'", () => {
    const breakdown = spendingByCategory(
      [
        row({ category: "food", amount_ars: 600 }),
        row({ category: "transport", amount_ars: 300 }),
        row({ category: "health", amount_ars: 100 }),
      ],
      "2026-06",
    );
    const top = topCategories(breakdown, 2);
    expect(top).toHaveLength(3); // food, transport, other(=health)
    expect(top[2].category).toBe("other");
    expect(top[2].ars).toBe(100);
  });

  it("no toca si hay <= top categorías", () => {
    const breakdown = spendingByCategory([row({ amount_ars: 100 })], "2026-06");
    expect(topCategories(breakdown, 6)).toHaveLength(1);
  });
});
