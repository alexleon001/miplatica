// Capa de acceso a AdMob (react-native-google-mobile-ads) — Sprint 10 Fase 2.
// Módulo NATIVO con el mismo riesgo OTA que RevenueCat: require() guardado,
// jamás import estático (TurboModuleRegistry tira al evaluar si el APK no trae
// el nativo). El SDK se inicializa LAZY la primera vez que un usuario Free
// monta un anuncio: a los Pro nunca se les pide consentimiento UMP ni se
// inicializa nada.
//
// IDs de bloque por env (EXPO_PUBLIC_ADMOB_BANNER_ANDROID / _IOS). El valor
// literal "test" usa los TestIds oficiales de Google (para builds preview/dev,
// donde clickear anuncios reales es tráfico inválido). Sin valor y fuera de
// __DEV__ → sin anuncios (capa apagada).

import { Platform } from "react-native";

type AdsModule = typeof import("react-native-google-mobile-ads");

let mod: AdsModule | null | undefined;

export function getAdsModule(): AdsModule | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line ts/no-require-imports -- require guardado a propósito: un import estático crashea el boot en APKs sin el módulo nativo (OTA)
    mod = require("react-native-google-mobile-ads") as AdsModule;
  } catch {
    mod = null;
  }
  return mod;
}

export function bannerAdUnitId(): string | null {
  const ads = getAdsModule();
  if (!ads) return null;
  const raw = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
  });
  if (raw === "test" || (__DEV__ && !raw)) return ads.TestIds.BANNER;
  return raw || null;
}

let initPromise: Promise<boolean> | null = null;

// Junta consentimiento UMP (muestra el form si la región lo exige) e inicializa
// el SDK, una sola vez por sesión. false = no se pueden pedir anuncios.
export function ensureAdsReady(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const ads = getAdsModule();
    if (!ads) return false;
    try {
      try {
        await ads.AdsConsent.gatherConsent();
      } catch {
        // Sin red o sin form configurado: seguimos con el consentimiento de la
        // sesión anterior (getConsentInfo decide si alcanza).
      }
      const { canRequestAds } = await ads.AdsConsent.getConsentInfo();
      if (!canRequestAds) return false;
      await ads.default().initialize();
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}
