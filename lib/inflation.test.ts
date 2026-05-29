import { expect, test } from "bun:test";
import {
  cumulativeInflation,
  monthStart,
  realReturn,
  realReturnForPosition,
  type InflationRow,
} from "./inflation";

// Serie de ejemplo: ene-abr 2026.
const ROWS: InflationRow[] = [
  { month: "2026-01-01", ipc: 2.0 },
  { month: "2026-02-01", ipc: 2.9 },
  { month: "2026-03-01", ipc: 3.4 },
  { month: "2026-04-01", ipc: 2.6 },
];

test("monthStart normaliza al primer día del mes", () => {
  expect(monthStart("2026-04-30")).toBe("2026-04-01");
  expect(monthStart("2026-04-15T12:00:00Z")).toBe("2026-04-01");
  expect(monthStart(null)).toBeNull();
  expect(monthStart("basura")).toBeNull();
});

test("cumulativeInflation compone los meses posteriores a la compra", () => {
  // Compra 2026-01-10 → excluye enero (mes de compra), compone feb+mar+abr.
  const expected = ((1.029 * 1.034 * 1.026) - 1) * 100;
  expect(cumulativeInflation(ROWS, "2026-01-10", "2026-04-30")).toBeCloseTo(expected, 6);
});

test("cumulativeInflation incluye el mes de `to` y excluye el de `from`", () => {
  // from feb, to mar → solo marzo.
  expect(cumulativeInflation(ROWS, "2026-02-15", "2026-03-20")).toBeCloseTo(3.4, 6);
});

test("cumulativeInflation devuelve 0 si el período no abarca meses completos", () => {
  expect(cumulativeInflation(ROWS, "2026-04-02", "2026-04-28")).toBe(0);
});

test("cumulativeInflation devuelve null sin datos cargados", () => {
  expect(cumulativeInflation([], "2026-01-01", "2026-04-30")).toBeNull();
});

test("realReturn aplica Fisher", () => {
  // 10% nominal con 8% de inflación → ~1.85% real.
  expect(realReturn(10, 8)).toBeCloseTo(((1.1 / 1.08) - 1) * 100, 6);
  // Empatar la inflación → 0% real.
  expect(realReturn(5, 5)).toBeCloseTo(0, 9);
  // Perder contra la inflación → real negativo.
  expect(realReturn(3, 10)).toBeLessThan(0);
});

test("realReturnForPosition deriva nominal en ARS y lo ajusta", () => {
  // valor 130k, P&L +30k → costo 100k → +30% nominal.
  const r = realReturnForPosition(
    { currentValueArs: 130_000, profitLossArs: 30_000, since: "2026-01-10" },
    ROWS,
    "2026-04-30",
  );
  expect(r).not.toBeNull();
  expect(r!.nominalPct).toBeCloseTo(30, 6);
  const infl = ((1.029 * 1.034 * 1.026) - 1) * 100;
  expect(r!.inflationPct).toBeCloseTo(infl, 6);
  expect(r!.realPct).toBeCloseTo(realReturn(30, infl), 6);
});

test("realReturnForPosition devuelve null con datos insuficientes", () => {
  expect(
    realReturnForPosition({ currentValueArs: null, profitLossArs: 1, since: "2026-01-01" }, ROWS, "2026-04-30"),
  ).toBeNull();
  // Costo no positivo.
  expect(
    realReturnForPosition({ currentValueArs: 100, profitLossArs: 200, since: "2026-01-01" }, ROWS, "2026-04-30"),
  ).toBeNull();
  // Sin datos de inflación.
  expect(
    realReturnForPosition({ currentValueArs: 130_000, profitLossArs: 30_000, since: "2026-01-01" }, [], "2026-04-30"),
  ).toBeNull();
});
