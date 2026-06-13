import { describe, expect, it } from "bun:test";
import {
  INTERSTITIAL_EVERY_N_EVENTS,
  INTERSTITIAL_MIN_INTERVAL_MS,
  interstitialDue,
} from "./ad-frequency";

const NOW = 1_750_000_000_000;

describe("interstitialDue", () => {
  it("no muestra antes de juntar N eventos", () => {
    expect(interstitialDue({ events: 0, lastShownAt: null }, NOW)).toBe(false);
    expect(interstitialDue({ events: INTERSTITIAL_EVERY_N_EVENTS - 1, lastShownAt: null }, NOW)).toBe(false);
  });

  it("muestra al juntar N eventos sin anuncio previo", () => {
    expect(interstitialDue({ events: INTERSTITIAL_EVERY_N_EVENTS, lastShownAt: null }, NOW)).toBe(true);
  });

  it("respeta el intervalo mínimo aunque haya eventos de sobra", () => {
    const justShown = NOW - INTERSTITIAL_MIN_INTERVAL_MS + 1_000;
    expect(interstitialDue({ events: INTERSTITIAL_EVERY_N_EVENTS * 2, lastShownAt: justShown }, NOW)).toBe(false);
  });

  it("vuelve a mostrar pasado el intervalo mínimo", () => {
    const longAgo = NOW - INTERSTITIAL_MIN_INTERVAL_MS - 1;
    expect(interstitialDue({ events: INTERSTITIAL_EVERY_N_EVENTS, lastShownAt: longAgo }, NOW)).toBe(true);
  });

  it("eventos por encima de N siguen contando como elegibles", () => {
    expect(interstitialDue({ events: INTERSTITIAL_EVERY_N_EVENTS + 3, lastShownAt: null }, NOW)).toBe(true);
  });
});
