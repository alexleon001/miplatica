import { describe, expect, it } from "bun:test";
import {
  evaluateRateAlerts,
  rateAlertBody,
  rateAlertSummary,
  type RateAlertConfig,
} from "./rate-alerts";

function cfg(over: Partial<RateAlertConfig> = {}): RateAlertConfig {
  return {
    id: "a1",
    rate: "mep",
    direction: "above",
    threshold: 1500,
    triggered: false,
    ...over,
  };
}

describe("evaluateRateAlerts", () => {
  it("dispara cuando 'above' cruza el umbral y estaba armada", () => {
    const { fired, nextState } = evaluateRateAlerts([cfg()], { mep: 1520 });
    expect(fired).toHaveLength(1);
    expect(fired[0].id).toBe("a1");
    expect(fired[0].value).toBe(1520);
    expect(nextState.a1).toBe(true);
  });

  it("no dispara si todavía no llegó al umbral", () => {
    const { fired, nextState } = evaluateRateAlerts([cfg()], { mep: 1480 });
    expect(fired).toHaveLength(0);
    expect(nextState.a1).toBe(false);
  });

  it("no re-dispara mientras sigue cumpliendo (ya triggered)", () => {
    const { fired, nextState } = evaluateRateAlerts([cfg({ triggered: true })], { mep: 1600 });
    expect(fired).toHaveLength(0);
    expect(nextState.a1).toBe(true);
  });

  it("se re-arma cuando la cotización vuelve del otro lado", () => {
    const { fired, nextState } = evaluateRateAlerts([cfg({ triggered: true })], { mep: 1400 });
    expect(fired).toHaveLength(0);
    expect(nextState.a1).toBe(false); // re-armada → puede volver a disparar
  });

  it("dispara de nuevo tras re-armarse", () => {
    // ciclo completo: cruza → re-arma → vuelve a cruzar
    let state = evaluateRateAlerts([cfg()], { mep: 1520 }).nextState;
    expect(state.a1).toBe(true);
    state = evaluateRateAlerts([cfg({ triggered: state.a1 })], { mep: 1400 }).nextState;
    expect(state.a1).toBe(false);
    const again = evaluateRateAlerts([cfg({ triggered: state.a1 })], { mep: 1520 });
    expect(again.fired).toHaveLength(1);
  });

  it("'below' dispara cuando baja del umbral", () => {
    const { fired } = evaluateRateAlerts(
      [cfg({ direction: "below", threshold: 1000 })],
      { mep: 950 },
    );
    expect(fired).toHaveLength(1);
  });

  it("límite exacto cuenta como cumplido (>=/<=)", () => {
    expect(evaluateRateAlerts([cfg({ threshold: 1500 })], { mep: 1500 }).fired).toHaveLength(1);
    expect(
      evaluateRateAlerts([cfg({ direction: "below", threshold: 1000 })], { mep: 1000 }).fired,
    ).toHaveLength(1);
  });

  it("sin cotización del rate no cambia el estado ni dispara", () => {
    const { fired, nextState } = evaluateRateAlerts([cfg({ triggered: true })], { mep: null });
    expect(fired).toHaveLength(0);
    expect(nextState.a1).toBe(true); // conserva el estado previo
  });

  it("evalúa varias alertas de distintos tipos en paralelo", () => {
    const { fired } = evaluateRateAlerts(
      [
        cfg({ id: "mep-up", rate: "mep", direction: "above", threshold: 1500 }),
        cfg({ id: "blue-down", rate: "blue", direction: "below", threshold: 1000 }),
        cfg({ id: "ccl-up", rate: "ccl", direction: "above", threshold: 9999 }),
      ],
      { mep: 1510, blue: 980, ccl: 1600 },
    );
    expect(fired.map((f) => f.id).sort()).toEqual(["blue-down", "mep-up"]);
  });
});

describe("textos", () => {
  it("rateAlertSummary describe la condición", () => {
    expect(rateAlertSummary({ rate: "mep", direction: "above", threshold: 1500 })).toBe(
      "MEP supera $1.500",
    );
    expect(rateAlertSummary({ rate: "blue", direction: "below", threshold: 1000 })).toBe(
      "Blue baja de $1.000",
    );
  });

  it("rateAlertBody menciona el valor actual", () => {
    const body = rateAlertBody({ id: "a1", rate: "mep", direction: "above", threshold: 1500, value: 1523 });
    expect(body).toContain("MEP");
    expect(body).toContain("superó");
    expect(body).toContain("$1.500");
    expect(body).toContain("$1.523");
  });
});
