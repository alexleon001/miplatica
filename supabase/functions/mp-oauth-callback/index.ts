// ============================================
// Mi Platica — Edge Function: mp-oauth-callback
// ============================================
// Recibe el redirect de Mercado Pago (?code=&state=), valida el state contra
// mp_oauth_states (→ owner_id), canjea el code por tokens usando el
// client_secret (server-side) y los guarda CIFRADOS vía mp_store_connection
// (pgcrypto). Al terminar redirige a la app por deep link (miplatica://...).
//
// Endpoint: GET /functions/v1/mp-oauth-callback   (MP redirige acá)
// Auth: verify_jwt = false (la llama MP, sin JWT; la seguridad la da el state)
//
// Secrets: MP_CLIENT_ID, MP_CLIENT_SECRET, MP_REDIRECT_URI, MP_TOKEN_KEY
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const APP_SCHEME = "miplatica";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const mpError = url.searchParams.get("error");

  if (mpError) return redirectToApp(`error=${encodeURIComponent(mpError)}`);
  if (!code || !state) return redirectToApp("error=missing_code_or_state");

  const clientId = Deno.env.get("MP_CLIENT_ID");
  const clientSecret = Deno.env.get("MP_CLIENT_SECRET");
  const redirectUri = Deno.env.get("MP_REDIRECT_URI");
  const tokenKey = Deno.env.get("MP_TOKEN_KEY");
  if (!clientId || !clientSecret || !redirectUri || !tokenKey) {
    return redirectToApp("error=server_misconfigured");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Validar + consumir el state (un solo uso).
  const { data: stateRow, error: stateErr } = await supabase
    .from("mp_oauth_states")
    .select("owner_id")
    .eq("state", state)
    .maybeSingle();
  if (stateErr || !stateRow) return redirectToApp("error=invalid_state");
  await supabase.from("mp_oauth_states").delete().eq("state", state);

  // Canje del code por tokens (client_secret server-side).
  let tokens: {
    access_token?: string;
    refresh_token?: string;
    user_id?: number | string;
    scope?: string;
    expires_in?: number;
  };
  try {
    const res = await fetch(MP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    tokens = await res.json();
    if (!res.ok || !tokens.access_token) {
      console.warn("[mp-oauth-callback] token exchange falló:", res.status, tokens);
      return redirectToApp("error=token_exchange_failed");
    }
  } catch (e) {
    console.warn("[mp-oauth-callback] token exchange error:", e);
    return redirectToApp("error=token_exchange_error");
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error: storeErr } = await supabase.rpc("mp_store_connection", {
    p_owner: stateRow.owner_id,
    p_mp_user: tokens.user_id != null ? String(tokens.user_id) : null,
    p_access: tokens.access_token,
    p_refresh: tokens.refresh_token ?? null,
    p_scope: tokens.scope ?? null,
    p_expires: expiresAt,
    p_key: tokenKey,
  });
  if (storeErr) {
    console.warn("[mp-oauth-callback] mp_store_connection falló:", storeErr.message);
    return redirectToApp("error=store_failed");
  }

  return redirectToApp("ok=1");
});

// 302 al deep link de la app + página de fallback (por si el navegador no salta).
function redirectToApp(query: string): Response {
  const target = `${APP_SCHEME}://mp-connected?${query}`;
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}">` +
      `<p>Volviendo a Mi Plata… <a href="${target}">Abrir la app</a></p>`,
    { status: 302, headers: { Location: target, "Content-Type": "text/html; charset=utf-8" } },
  );
}
