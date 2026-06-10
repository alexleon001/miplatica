// Banner de AdMob para usuarios Free (Sprint 10 Fase 2). Render seguro en
// capas: Pro o entitlement cargando → nada; módulo nativo ausente (APK viejo
// vía OTA / Expo Go) → nada; sin unit ID configurado → nada. Recién cuando hay
// un Free elegible se inicializa el SDK (y se dispara el flujo de
// consentimiento UMP) — ver lib/ads.ts.

import { useEffect, useState } from "react";
import { View } from "react-native";
import { bannerAdUnitId, ensureAdsReady, getAdsModule } from "../lib/ads";
import { usePro } from "../lib/hooks/use-pro";
import { spacing } from "../lib/theme";

export function AdBanner() {
  const { isPro, isLoading } = usePro();
  const [ready, setReady] = useState(false);
  const eligible = !isPro && !isLoading && bannerAdUnitId() != null;

  useEffect(() => {
    if (!eligible || ready) return;
    let alive = true;
    void ensureAdsReady().then((ok) => {
      if (alive && ok) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [eligible, ready]);

  if (!eligible || !ready) return null;
  const ads = getAdsModule();
  const unitId = bannerAdUnitId();
  if (!ads || unitId == null) return null;
  const { BannerAd, BannerAdSize } = ads;

  return (
    <View style={{ alignItems: "center", marginTop: spacing.sm }}>
      <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
