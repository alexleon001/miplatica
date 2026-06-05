import { describe, expect, it } from "bun:test";
import {
  realAnnualRate,
  simulate,
  suggestedMonthlyInflation,
  type SimInstrument,
} from "./invest-sim";

const ARS_FT: SimInstrument = { id: "ft", label: "Plazo fijo", annualRatePct: 36, currency: "ARS" };
const USD_HOLD: SimInstrument = { id: "usd", label: "Dólar", annualRatePct: 0, currency: "USD" };

describe("simulate", () => {
  it("plazo fijo capitaliza mensualmente a TEM = TNA/12", () => {
    // 36% TNA → 3% mensual. 12 meses → 1.03^12 ≈ 1.4258
    const [r] = simulate(100_000, 12, 0, [ARS_FT]);
    expect(r.nominalArs).toBeCloseTo(100_000 * Math.pow(1.03, 12), 2);
    expect(r.realGainPct).toBeGreaterThan(0); // sin inflación, real == nominal
  });

  it("con inflación = tasa, el real queda en cero (no le gana)", () => {
    // 36% TNA → 3% mensual; inflación 3% mensual → real ≈ 0
    const [r] = simulate(100_000, 12, 3, [ARS_FT]);
    expect(r.realArs).toBeCloseTo(100_000, 0);
    expect(Math.abs(r.realGainPct)).toBeLessThan(0.001);
    expect(r.beatsInflation).toBe(false);
  });

  it("dólar holding (0% USD) preserva el valor real cuando el MEP sigue la inflación", () => {
    const [r] = simulate(100_000, 12, 4, [USD_HOLD]);
    expect(r.realArs).toBeCloseTo(100_000, 0); // real ≈ capital → cobertura
    expect(r.nominalArs).toBeCloseTo(100_000 * Math.pow(1.04, 12), 0); // nominal sube con inflación
  });

  it("ordena por mayor valor real (el ganador primero)", () => {
    const results = simulate(100_000, 12, 3, [
      { id: "low", label: "FCI", annualRatePct: 30, currency: "ARS" },
      { id: "high", label: "Plazo fijo", annualRatePct: 48, currency: "ARS" },
      USD_HOLD,
    ]);
    expect(results[0].id).toBe("high");
    expect(results[0].realArs).toBeGreaterThanOrEqual(results[1].realArs);
    expect(results[1].realArs).toBeGreaterThanOrEqual(results[2].realArs);
  });

  it("capital cero no rompe (gains 0)", () => {
    const [r] = simulate(0, 12, 3, [ARS_FT]);
    expect(r.nominalGainPct).toBe(0);
    expect(r.realGainPct).toBe(0);
  });
});

describe("suggestedMonthlyInflation", () => {
  it("promedia los últimos 3 meses por default", () => {
    const series = [
      { month: "2026-03-01", ipc: 5 },
      { month: "2026-04-01", ipc: 3 },
      { month: "2026-05-01", ipc: 2 },
      { month: "2026-06-01", ipc: 1 },
    ];
    expect(suggestedMonthlyInflation(series)).toBeCloseTo((3 + 2 + 1) / 3, 5);
  });
  it("devuelve null sin datos", () => {
    expect(suggestedMonthlyInflation([])).toBeNull();
  });
});

describe("realAnnualRate", () => {
  it("Fisher: tasa real anual = (1+nominal)/(1+inflación) − 1", () => {
    // 36% TNA (3% mensual → 42.6% efectiva anual) vs 3% mensual inflación (42.6% anual) → ~0
    expect(realAnnualRate(36, 3)).toBeCloseTo(0, 1);
  });
  it("tasa nominal mayor a la inflación da real positivo", () => {
    expect(realAnnualRate(60, 3)).toBeGreaterThan(0);
  });
});
