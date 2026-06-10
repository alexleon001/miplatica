// ============================================
// Mi Platica — Edge Function: revenuecat-webhook (Sprint 10: monetización, Fase 2)
// ============================================
// Recibe los eventos de RevenueCat y mantiene `public.entitlements` como fuente de
// verdad del Pro. Escribe con service_role (la tabla no permite escritura al rol
// authenticated). El cliente lee el resultado vía is_pro() (usePro()).
//
// Endpoint: POST /functions/v1/revenuecat-webhook
// Auth: verify_jwt = false (RevenueCat no manda JWT de Supabase) → se protege con
//   un secreto compartido en el header Authorization, configurado en el panel de
//   RevenueCat (Integrations → Webhooks → Authorization header) y como secret acá.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_WEBHOOK_SECRET
//
// Requisito del cliente (Fase 2): hacer Purchases.logIn(supabaseUserId) para que
// `event.app_user_id` sea el UUID del usuario de Supabase.
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Tipos de evento que dejan al usuario SIN Pro (vencido/reembolsado/pausado).
const INACTIVE_TYPES = new Set([
  "EXPIRATION",
  "REFUND",
  "SUBSCRIPTION_PAUSED",
]);

// Eventos que no tocan el entitlement (solo informativos).
const IGNORED_TYPES = new Set([
  "TEST",
  "SUBSCRIBER_ALIAS",
  "TRANSFER", // el id de usuario cambia; se reconcilia con el próximo evento real
]);

type RcEvent = {
  type?: string;
  app_user_id?: string;
  product_id?: string;
  store?: string; // "PLAY_STORE" | "APP_STORE" | "PROMOTIONAL" | ...
  expiration_at_ms?: number | null;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1) Auth por secreto compartido (header Authorization configurado en RevenueCat).
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expected) return json({ error: "Server misconfigured: REVENUECAT_WEBHOOK_SECRET missing" }, 500);
  if (req.headers.get("Authorization") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  let payload: { event?: RcEvent };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const event = payload.event;
  if (!event?.type || !event.app_user_id) {
    return json({ error: "Missing event.type or event.app_user_id" }, 400);
  }

  // Eventos puramente informativos: ack sin tocar la tabla.
  if (IGNORED_TYPES.has(event.type)) {
    return json({ ok: true, ignored: event.type });
  }

  // El app_user_id debe ser el UUID de Supabase (Purchases.logIn). Si es un id
  // anónimo de RevenueCat ($RCAnonymousID:...) no hay a quién atribuirlo.
  const userId = event.app_user_id;
  if (userId.startsWith("$RCAnonymousID")) {
    return json({ ok: true, skipped: "anonymous_app_user_id" });
  }

  // 2) Resolver si queda Pro: inactivo por tipo explícito, o por vencimiento pasado.
  const now = Date.now();
  const exp = event.expiration_at_ms ?? null;
  const isPro = INACTIVE_TYPES.has(event.type)
    ? false
    : exp == null || exp > now;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      is_pro: isPro,
      product_id: event.product_id ?? null,
      store: storeLabel(event.store),
      expires_at: exp != null ? new Date(exp).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return json({ error: "Failed to upsert entitlement", detail: error.message }, 500);
  }

  return json({ ok: true, user_id: userId, is_pro: isPro, event: event.type });
});

function storeLabel(store?: string): string {
  switch (store) {
    case "PLAY_STORE": return "play";
    case "APP_STORE": return "app_store";
    case "PROMOTIONAL": return "promo";
    default: return store ? store.toLowerCase() : "unknown";
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
