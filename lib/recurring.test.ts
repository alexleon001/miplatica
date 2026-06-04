import { describe, expect, it } from "bun:test";
import { currentPeriod, pendingTemplates, templateToTxInput, type RecurringTemplate } from "./recurring";

const tpl = (over: Partial<RecurringTemplate>): RecurringTemplate => ({
  id: "t1",
  accountId: "a1",
  type: "expense",
  category: "rent",
  amountArs: 100000,
  amountUsd: null,
  description: "Alquiler",
  lastRegisteredPeriod: "2026-05",
  ...over,
});

describe("pendingTemplates", () => {
  it("incluye las no registradas en el período actual", () => {
    const list = [tpl({ id: "a", lastRegisteredPeriod: "2026-05" }), tpl({ id: "b", lastRegisteredPeriod: "2026-06" })];
    const pending = pendingTemplates(list, "2026-06");
    expect(pending.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("templateToTxInput", () => {
  it("arma el input con fecha de hoy y source recurring", () => {
    const input = templateToTxInput(tpl({}), "2026-06-04");
    expect(input).toMatchObject({
      account_id: "a1",
      type: "expense",
      category: "rent",
      amount_ars: 100000,
      amount_usd: null,
      source: "recurring",
      date: "2026-06-04",
    });
  });
});

describe("currentPeriod", () => {
  it("formatea YYYY-MM", () => {
    expect(currentPeriod(new Date(2026, 0, 9))).toBe("2026-01");
  });
});
