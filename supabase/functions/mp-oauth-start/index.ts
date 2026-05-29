// ============================================
// Mi Platica — Edge Function: mp-oauth-start
// ============================================
// Inicia el flujo OAuth de Mercado Pago. Corre con el JWT del usuario:
// genera un `state` de un solo uso (asociado al user), lo guarda y devuelve la
// URL de autorización de MP para que el cliente la abra en el browser.
//
// Endpoint: POST /functions/v1/mp-oauth-start
// Auth: verify_jwt = true
// Response 200: { authUrl: string }
//
// Secrets necesarios: MP_CLIENT_ID, MP_REDIRECT_URI
//   MP_REDIRECT_URI debe ser exactamente la URL pública de mp-oauth-callback y
//   estar registrada en el panel de la app de MP.
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_AUTH_URL = "https://auth.mercadopago.com/authorization";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const clientId = Deno.env.get("MP_CLIENT_ID");
  const redirectUri = Deno.env.get("MP_REDIRECT_URI");
  if (!clientId || !redirectUri) {
    return json({ error: "Server misconfigured: MP_CLIENT_ID / MP_REDIRECT_URI missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  // state de un solo uso (anti-CSRF + asocia el callback sin-JWT a este user).
  const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const { error: insErr } = await supabase
    .from("mp_oauth_states")
    .insert({ state, owner_id: userData.user.id });
  if (insErr) return json({ error: insErr.message }, 500);

  const url = new URL(MP_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return json({ authUrl: url.toString() });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
