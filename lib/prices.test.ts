import { expect, test } from "bun:test";
import { isPriceStale, staleLabel } from "./prices";

const NOW = new Date("2026-05-29T15:00:00");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

test("isPriceStale: null/inválido se considera stale", () => {
  expect(isPriceStale(null, NOW)).toBe(true);
  expect(isPriceStale(undefined, NOW)).toBe(true);
  expect(isPriceStale("no-es-fecha", NOW)).toBe(true);
});

test("isPriceStale: reciente no es stale, viejo sí (umbral 18h)", () => {
  expect(isPriceStale(hoursAgo(2), NOW)).toBe(false);
  expect(isPriceStale(hoursAgo(17), NOW)).toBe(false);
  expect(isPriceStale(hoursAgo(19), NOW)).toBe(true);
});

test("isPriceStale: umbral configurable", () => {
  expect(isPriceStale(hoursAgo(2), NOW, 1)).toBe(true);
  expect(isPriceStale(hoursAgo(2), NOW, 3)).toBe(false);
});

test("staleLabel formatea el día o avisa sin precio", () => {
  expect(staleLabel(null)).toBe("sin precio");
  expect(staleLabel("no-es-fecha")).toBe("sin precio");
  expect(staleLabel("2026-05-12T13:00:00")).toContain("precio del");
});
