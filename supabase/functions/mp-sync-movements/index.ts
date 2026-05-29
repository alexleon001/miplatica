// ============================================
// Mi Platica — Edge Function: mp-sync-movements
// ============================================
// Sincroniza los pagos RECIBIDOS en Mercado Pago del usuario hacia
// `transactions` (source='mercadopago_api', dedup por external_id, regla #4).
// Corre con el JWT del usuario; usa service_role para descifrar los tokens
// (mp_get_tokens) y para upsertar. Refresca el access_token si está por vencer.
//
// CAVEAT: la API de MP por OAuth es de cobrador → trae pagos recibidos
// (/v1/payments/search como collector), no la billetera personal completa.
//
// Endpoint: POST /functions/v1/mp-sync-movements
// Auth: verify_jwt = true
// Response 200: { inserted, skipped, fetched, last_synced_at }
//
// Secrets: MP_CLIENT_ID, MP_CLIENT_SECRET, MP_TOKEN_KEY
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const MP_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments/search";
const PAGE_LIMIT = 100;

// deno-lint-ignore no-explicit-any
type Sb = any;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const clientId = Deno.env.get("MP_CLIENT_ID");
  const clientSecret = Deno.env.get("MP_CLIENT_SECRET");
  const tokenKey = Deno.env.get("MP_TOKEN_KEY");
  if (!clientId || !clientSecret || !tokenKey) {
    return json({ error: "Server misconfigured: MP_CLIENT_ID/SECRET/TOKEN_KEY missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  // Identidad del usuario por su JWT.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
  const ownerId = userData.user.id;

  // service_role: descifrar tokens + upsertar.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: tokRows, error: tokErr } = await admin.rpc("mp_get_tokens", {
    p_owner: ownerId,
    p_key: tokenKey,
  });
  if (tokErr) return json({ error: tokErr.message }, 500);
  const tok = Array.isArray(tokRows) ? tokRows[0] : tokRows;
  if (!tok?.access_token) return json({ error: "Mercado Pago no está conectado" }, 400);

  // Refrescar si vence en < 5 min y tenemos refresh_token.
  let accessToken: string = tok.access_token;
  const expMs = tok.expires_at ? new Date(tok.expires_at).getTime() : 0;
  if (tok.refresh_token && expMs && expMs - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshToken(admin, ownerId, clientId, clientSecret, tokenKey, tok.refresh_token);
    if (refreshed) accessToken = refreshed;
  }

  // Cuenta destino (find-or-create "Mercado Pago", wallet ARS).
  let accountId: string;
  try {
    accountId = await ensureMpAccount(admin, ownerId);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "No pude crear la cuenta MP" }, 500);
  }

  // Traer pagos recibidos (collector). Best-effort: si MP falla, devolvemos error claro.
  let payments: MpPayment[];
  try {
    payments = await fetchPayments(accessToken);
  } catch (e) {
    return json({ error: "MP payments search falló", detail: e instanceof Error ? e.message : String(e) }, 502);
  }

  const rows = payments
    .filter((p) => p && p.id != null && typeof p.transaction_amount === "number")
    .map((p) => ({
      owner_id: ownerId,
      account_id: accountId,
      type: "income",
      category: null,
      amount_ars: p.transaction_amount,
      description: p.description ?? p.payment_method_id ?? "Pago Mercado Pago",
      merchant: p.payer?.email ?? null,
      date: (p.date_approved ?? p.date_created ?? new Date().toISOString()).slice(0, 10),
      source: "mercadopago_api",
      external_id: String(p.id),
    }));

  let inserted = 0;
  if (rows.length) {
    const { data, error } = await admin
      .from("transactions")
      .upsert(rows, { onConflict: "owner_id,source,external_id", ignoreDuplicates: true })
      .select("id");
    if (error) return json({ error: error.message }, 500);
    inserted = data?.length ?? 0;
  }

  const lastSyncedAt = new Date().toISOString();
  await admin.from("mp_connections").update({ last_synced_at: lastSyncedAt }).eq("owner_id", ownerId);

  return json({ inserted, skipped: rows.length - inserted, fetched: payments.length, last_synced_at: lastSyncedAt });
});

type MpPayment = {
  id?: number | string;
  status?: string;
  transaction_amount?: number;
  description?: string | null;
  payment_method_id?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  payer?: { email?: string | null } | null;
};

async function fetchPayments(accessToken: string): Promise<MpPayment[]> {
  const url = new URL(MP_PAYMENTS_URL);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MP ${res.status}`);
  const body = (await res.json()) as { results?: MpPayment[] };
  return body.results ?? [];
}

async function refreshToken(
  admin: Sb,
  ownerId: string,
  clientId: string,
  clientSecret: string,
  tokenKey: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(MP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const t = await res.json();
    if (!res.ok || !t.access_token) {
      console.warn("[mp-sync] refresh falló:", res.status, t);
      return null;
    }
    const expiresAt = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
    await admin.rpc("mp_store_connection", {
      p_owner: ownerId,
      p_mp_user: t.user_id != null ? String(t.user_id) : null,
      p_access: t.access_token,
      p_refresh: t.refresh_token ?? null,
      p_scope: t.scope ?? null,
      p_expires: expiresAt,
      p_key: tokenKey,
    });
    return t.access_token as string;
  } catch (e) {
    console.warn("[mp-sync] refresh error:", e);
    return null;
  }
}

async function ensureMpAccount(admin: Sb, ownerId: string): Promise<string> {
  const { data: existing } = await admin
    .from("accounts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("integration_type", "api")
    .eq("name", "Mercado Pago")
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("accounts")
    .insert({
      owner_id: ownerId,
      name: "Mercado Pago",
      type: "wallet",
      currency: "ARS",
      integration_type: "api",
      integration_status: "connected",
      icon: "💳",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
