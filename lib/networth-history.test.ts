import { describe, expect, it } from "bun:test";
import { chartBars, summarize, upsertSnapshot, type NetWorthSnapshot } from "./networth-history";

const snap = (date: string, ars: number, usd: number | null = null): NetWorthSnapshot => ({ date, ars, usd });

describe("upsertSnapshot", () => {
  it("agrega y ordena por fecha", () => {
    let pts: NetWorthSnapshot[] = [];
    pts = upsertSnapshot(pts, snap("2026-06-02", 200));
    pts = upsertSnapshot(pts, snap("2026-06-01", 100));
    expect(pts.map((p) => p.date)).toEqual(["2026-06-01", "2026-06-02"]);
  });

  it("pisa el snapshot del mismo día (último gana)", () => {
    let pts = [snap("2026-06-01", 100)];
    pts = upsertSnapshot(pts, snap("2026-06-01", 150));
    expect(pts).toHaveLength(1);
    expect(pts[0].ars).toBe(150);
  });

  it("poda a maxPoints conservando los más recientes", () => {
    let pts: NetWorthSnapshot[] = [];
    for (let d = 1; d <= 5; d++) pts = upsertSnapshot(pts, snap(`2026-06-0${d}`, d * 10), 3);
    expect(pts.map((p) => p.date)).toEqual(["2026-06-03", "2026-06-04", "2026-06-05"]);
  });
});

describe("summarize", () => {
  it("calcula delta absoluto y porcentual", () => {
    const s = summarize([100, 120, 150])!;
    expect(s.first).toBe(100);
    expect(s.last).toBe(150);
    expect(s.deltaAbs).toBe(50);
    expect(s.deltaPct).toBeCloseTo(50);
    expect(s.min).toBe(100);
    expect(s.max).toBe(150);
  });

  it("deltaPct null si el primer valor es 0", () => {
    expect(summarize([0, 50])!.deltaPct).toBeNull();
  });

  it("null con serie vacía", () => {
    expect(summarize([])).toBeNull();
  });
});

describe("chartBars", () => {
  it("normaliza entre min y max", () => {
    const bars = chartBars([0, 50, 100], 0);
    expect(bars[0]).toBeCloseTo(0);
    expect(bars[1]).toBeCloseTo(0.5);
    expect(bars[2]).toBeCloseTo(1);
  });

  it("respeta la altura mínima de barra", () => {
    const bars = chartBars([0, 100], 0.1);
    expect(bars[0]).toBeCloseTo(0.1);
    expect(bars[1]).toBeCloseTo(1);
  });

  it("todas al tope si los valores son iguales", () => {
    expect(chartBars([7, 7, 7])).toEqual([1, 1, 1]);
  });
});
