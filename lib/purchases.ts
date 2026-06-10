// Capa de acceso a RevenueCat (react-native-purchases) — Sprint 10 Fase 2.
// El SDK es un módulo NATIVO: el APK preview actual NO lo trae y este JS puede
// llegarle por OTA. Un import estático reventaría el boot (TurboModuleRegistry
// tira al evaluar el módulo), así que TODO acceso pasa por un require()
// guardado. Si el módulo no está (APK viejo, Expo Go) o falta la API key
// pública (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY / _IOS_KEY), la capa degrada a
// "no disponible" y el paywall conserva el stub de compra.
//
// La verdad del entitlement sigue siendo server-side (webhook RevenueCat →
// tabla `entitlements` → is_pro()): acá solo se dispara la compra y se hace
// logIn con el UUID de Supabase para que el webhook escriba al user correcto.

import { Platform } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

type PurchasesModule = typeof import("react-native-purchases").default;

// Nombre del entitlement en el panel de RevenueCat. Tiene que llamarse así.
export const PRO_ENTITLEMENT_ID = "pro";

const API_KEY
  = Platform.select({
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  }) ?? null;

let mod: PurchasesModule | null | undefined;
// El require puede resolver el JS aunque el nativo falte; si después configure()
// tira, marcamos la capa como rota para el resto de la sesión.
let broken = false;
let configuredFor: string | null = null;

function getPurchases(): PurchasesModule | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line ts/no-require-imports -- require guardado a propósito: un import estático crashea el boot en APKs sin el módulo nativo (OTA)
    const required = require("react-native-purchases");
    mod = (required?.default ?? required) as PurchasesModule;
  } catch {
    mod = null;
  }
  return mod;
}

export function purchasesAvailable(): boolean {
  return API_KEY != null && !broken && getPurchases() != null;
}

// Mantiene al SDK apuntando al usuario de Supabase: configure en el primer
// login de la sesión, logIn si cambia el usuario, logOut al cerrar sesión.
// Idempotente y a prueba de fallos: cualquier error apaga la capa sin romper UI.
export async function syncPurchasesUser(userId: string | null): Promise<void> {
  const P = getPurchases();
  if (!P || API_KEY == null || broken) return;
  try {
    if (userId == null) {
      if (configuredFor != null) {
        configuredFor = null;
        await P.logOut();
      }
      return;
    }
    if (configuredFor === userId) return;
    if (await P.isConfigured()) {
      await P.logIn(userId);
    } else {
      P.configure({ apiKey: API_KEY, appUserID: userId });
    }
    configuredFor = userId;
  } catch {
    if (configuredFor == null) broken = true;
  }
}

export type ProOfferings = {
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
};

// Paquetes del offering "current" del panel de RevenueCat (tipos estándar
// $rc_annual / $rc_monthly). null = capa no disponible u offering sin armar.
export async function getProOfferings(): Promise<ProOfferings | null> {
  const P = getPurchases();
  if (!P || configuredFor == null || broken) return null;
  try {
    const offerings = await P.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return { annual: current.annual ?? null, monthly: current.monthly ?? null };
  } catch {
    return null;
  }
}

export type PurchaseResult = "purchased" | "cancelled" | "error" | "unavailable";

export async function purchasePro(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const P = getPurchases();
  if (!P || broken) return "unavailable";
  try {
    // Si resuelve, la compra se concretó en la tienda. El entitlement en
    // nuestra DB lo escribe el webhook (puede tardar unos segundos).
    await P.purchasePackage(pkg);
    return "purchased";
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return "cancelled";
    return "error";
  }
}

// Restaurar compras (requerido por Play). true si el entitlement Pro quedó
// activo en RevenueCat tras restaurar.
export async function restorePro(): Promise<boolean> {
  const P = getPurchases();
  if (!P || broken) return false;
  try {
    const info = await P.restorePurchases();
    return info.entitlements.active[PRO_ENTITLEMENT_ID] != null;
  } catch {
    return false;
  }
}
