// Interstitials para usuarios Free (Sprint 10 Fase 2). Mismo enfoque OTA-safe
// que lib/ads.ts: todo el acceso al SDK pasa por getAdsModule(); sin módulo
// nativo, sin unit ID o con Pro → no-op. El anuncio se precarga recién cuando
// el próximo evento podría mostrarlo (no se gastan requests de más) y se
// muestra solo cuando el tope de frecuencia (lib/ad-frequency.ts) lo permite.

import type { AdsModule } from "./ads";
import { INTERSTITIAL_EVERY_N_EVENTS, interstitialDue } from "./ad-frequency";
import { ensureAdsReady, getAdsModule, interstitialAdUnitId } from "./ads";
import { useAdFrequencyStore } from "./store/ads";

type Interstitial = ReturnType<AdsModule["InterstitialAd"]["createForAdRequest"]>;

let loadedAd: Interstitial | null = null;
let loading = false;

async function preload(unitId: string): Promise<void> {
  if (loadedAd || loading) return;
  loading = true;
  const ready = await ensureAdsReady();
  const ads = getAdsModule();
  if (!ready || !ads) {
    loading = false;
    return;
  }
  const ad = ads.InterstitialAd.createForAdRequest(unitId);
  ad.addAdEventListener(ads.AdEventType.LOADED, () => {
    loadedAd = ad;
    loading = false;
  });
  ad.addAdEventListener(ads.AdEventType.ERROR, () => {
    loading = false;
  });
  ad.load();
}

// Llamar después de una acción que califica (ej: guardar un movimiento).
// Registra el evento y, si el tope lo permite y hay un anuncio precargado, lo
// muestra; si todavía no hay uno cargado, precarga para el próximo evento.
export function maybeShowInterstitial(isPro: boolean): void {
  if (isPro) return;
  const unitId = interstitialAdUnitId();
  if (unitId == null) return;

  useAdFrequencyStore.getState().recordEvent();
  const { events, lastShownAt } = useAdFrequencyStore.getState();
  if (!interstitialDue({ events, lastShownAt }, Date.now())) {
    // Dejar uno listo si el próximo evento ya puede mostrarlo.
    if (events >= INTERSTITIAL_EVERY_N_EVENTS - 1) void preload(unitId);
    return;
  }

  const ad = loadedAd;
  if (!ad) {
    void preload(unitId);
    return;
  }
  loadedAd = null;
  useAdFrequencyStore.getState().recordShown(Date.now());
  // Espera corta para que el cierre del modal termine de animar antes de
  // abrir la Activity del anuncio.
  setTimeout(() => {
    ad.show().catch(() => {});
  }, 400);
}
