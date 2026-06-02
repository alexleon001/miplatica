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
// NOTA: el saldo de la billetera MP NO se puede leer por OAuth (el endpoint
// /users/{id}/mercadopago_account/balance devuelve 403 forbidden para cuentas
// personales). El saldo de la cuenta MP se carga a mano (accounts.balance_amount,
// editable en la app). Acá solo sincronizamos los pagos recibidos.
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

  // ID de MP del usuario → para clasificar dirección (cobra = ingreso, paga = gasto).
  const { data: conn } = await admin
    .from("mp_connections")
    .select("mp_user_id")
    .eq("owner_id", ownerId)
    .single();
  const mpUserId = conn?.mp_user_id != null ? String(conn.mp_user_id) : null;

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

  // Solo pagos reales aprobados. Se excluye money_transfer (transferencias entre
  // cuentas propias / espejos duplicados), investment (cuenta remunerada) y
  // account_fund (carga de saldo desde el banco por CVU): plata propia moviéndose.
  // Dirección: si el usuario es el cobrador (collector_id == su mp_user_id) es un
  // INGRESO (le pagan); si no, es un GASTO (él paga — compras, servicios, cobros).
  const rows = payments
    .filter((p) => p && p.id != null && typeof p.transaction_amount === "number")
    .filter((p) => p.status === "approved" && p.operation_type === "regular_payment")
    .map((p) => ({
      owner_id: ownerId,
      account_id: accountId,
      type: mpUserId != null && p.collector_id != null && String(p.collector_id) === mpUserId
        ? "income"
        : "expense",
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
  operation_type?: string | null;
  collector_id?: number | string | null;
  transaction_amount?: number;
  description?: string | null;
  payment_method_id?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  payer?: { email?: string | null } | null;
};

// Trae TODOS los pagos paginando (MP devuelve de a 100 + un paging.total).
// Cap de seguridad de MAX_PAGES para no colgarse en cuentas con mucho volumen.
async function fetchPayments(accessToken: string): Promise<MpPayment[]> {
  const MAX_PAGES = 20;
  const all: MpPayment[] = [];
  let offset = 0;
  for (let i = 0; i < MAX_PAGES; i++) {
    const url = new URL(MP_PAYMENTS_URL);
    url.searchParams.set("sort", "date_created");
    url.searchParams.set("criteria", "desc");
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`MP ${res.status}`);
    const body = (await res.json()) as { results?: MpPayment[]; paging?: { total?: number } };
    const batch = body.results ?? [];
    all.push(...batch);
    offset += PAGE_LIMIT;
    if (batch.length < PAGE_LIMIT || offset >= (body.paging?.total ?? all.length)) break;
  }
  return all;
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

// Find-or-create de la cuenta MP. Reusa CUALQUIER cuenta del user cuyo nombre
// matchee "mercado pago" (case/spacing-insensitive), sin importar el
// integration_type, para no duplicar la que el user pudo haber creado a mano.
// Prioriza una ya 'api'; si adopta una manual la promueve a 'api'/'connected'.
async function ensureMpAccount(admin: Sb, ownerId: string): Promise<string> {
  const { data: matches } = await admin
    .from("accounts")
    .select("id, integration_type")
    .eq("owner_id", ownerId)
    .or("name.ilike.%mercado%pago%,name.ilike.%mercadopago%")
    .order("created_at", { ascending: true });

  const existing = Array.isArray(matches) && matches.length
    ? (matches.find((a: { integration_type: string }) => a.integration_type === "api") ?? matches[0])
    : null;

  if (existing?.id) {
    if (existing.integration_type !== "api") {
      await admin
        .from("accounts")
        .update({ integration_type: "api", integration_status: "connected" })
        .eq("id", existing.id);
    }
    return existing.id;
  }

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
