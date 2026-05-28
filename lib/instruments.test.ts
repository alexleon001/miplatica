import { expect, test } from "bun:test";
import { deriveInvestmentValues, instrumentById, INSTRUMENT_TYPES } from "./instruments";

const MEP = 1000;

test("instrumento de mercado en ARS: valor/PL + USD vía MEP", () => {
  const d = deriveInvestmentValues({
    type: "cedear", currency: "ARS", quantity: 10, avgCost: 100, currentPrice: 120, mep: MEP,
  });
  expect(d.current_value_ars).toBe(1200);
  expect(d.current_value_usd).toBe(1.2);
  expect(d.profit_loss_ars).toBe(200);
  expect(d.profit_loss_pct).toBe(20);
});

test("instrumento en USD: ARS vía MEP", () => {
  const d = deriveInvestmentValues({
    type: "crypto", currency: "USD", quantity: 2, avgCost: 100, currentPrice: 150, mep: MEP,
  });
  expect(d.current_value_usd).toBe(300);
  expect(d.current_value_ars).toBe(300000);
  expect(d.profit_loss_pct).toBe(50);
});

test("sin precio actual usa el costo (PL 0)", () => {
  const d = deriveInvestmentValues({
    type: "fci", currency: "ARS", quantity: 5, avgCost: 200, currentPrice: null, mep: MEP,
  });
  expect(d.current_value_ars).toBe(1000);
  expect(d.profit_loss_pct).toBe(0);
});

test("plazo fijo: devenga interés a hoy", () => {
  const start = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const d = deriveInvestmentValues({
    type: "plazo_fijo", currency: "ARS", quantity: 100000, interestRate: 36.5, purchaseDate: start, mep: MEP,
  });
  expect(d.profit_loss_ars!).toBeGreaterThan(35000);
  expect(d.profit_loss_ars!).toBeLessThan(38000);
  expect(d.current_value_ars!).toBeGreaterThan(135000);
});

test("dólar MEP/billete: USD al par, ARS vía MEP, ganancia real en ARS", () => {
  const d = deriveInvestmentValues({
    type: "dolar_mep", currency: "USD", quantity: 100, avgCost: 800, mep: MEP,
  });
  expect(d.current_value_usd).toBe(100);
  expect(d.current_value_ars).toBe(100000);
  expect(d.profit_loss_usd).toBe(0);
  expect(d.profit_loss_ars).toBe(20000);
  expect(d.profit_loss_pct).toBe(25);
});

test("diccionario de instrumentos íntegro", () => {
  for (const t of INSTRUMENT_TYPES) expect(instrumentById(t)).toBeDefined();
  expect(instrumentById("nope")).toBeUndefined();
});
