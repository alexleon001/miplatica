// Rewarded ads (Sprint 10 Fase 2) — puente Free→Pro ("mirá un anuncio = 1 uso
// de IA"). Por ahora SOLO el helper client-side, sin UI que lo llame: otorgar
// el uso de IA requiere un crédito server-side en ai-gate (sin eso el edge
// sigue devolviendo 402 y el anuncio no compraría nada). Cablear la UI junto
// con ese cambio. Carga on-demand: el usuario lo pide explícitamente, la
// espera de carga es aceptable.

import { ensureAdsReady, getAdsModule, rewardedAdUnitId } from "./ads";

export type RewardedOutcome = "earned" | "dismissed" | "unavailable";

const LOAD_TIMEOUT_MS = 15_000;

export async function showRewardedAd(): Promise<RewardedOutcome> {
  const unitId = rewardedAdUnitId();
  if (unitId == null) return "unavailable";
  const ready = await ensureAdsReady();
  const ads = getAdsModule();
  if (!ready || !ads) return "unavailable";

  const ad = ads.RewardedAd.createForAdRequest(unitId);
  return new Promise<RewardedOutcome>((resolve) => {
    let earned = false;
    let opened = false;
    let settled = false;
    const settle = (outcome: RewardedOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    // Si la carga se cuelga sin disparar ERROR (red caída a mitad de request),
    // no dejar al caller esperando para siempre.
    const timer = setTimeout(() => {
      if (!opened) settle("unavailable");
    }, LOAD_TIMEOUT_MS);

    ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
      ad.show().catch(() => settle("unavailable"));
    });
    ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    ad.addAdEventListener(ads.AdEventType.OPENED, () => {
      opened = true;
    });
    ad.addAdEventListener(ads.AdEventType.CLOSED, () => settle(earned ? "earned" : "dismissed"));
    ad.addAdEventListener(ads.AdEventType.ERROR, () => settle("unavailable"));
    ad.load();
  });
}
