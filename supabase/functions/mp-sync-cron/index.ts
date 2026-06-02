// ============================================
// Mi Platica — Edge Function: mp-sync-cron
// ============================================
// Versión scheduleable de mp-sync-movements: corre con service_role e itera
// TODAS las conexiones de Mercado Pago, sincronizando los pagos recibidos de
// cada usuario. Pensada para pg_cron (verify_jwt=false, keyless).
//
// Anti-abuso / dedup: saltea conexiones sincronizadas hace < SKIP_RECENT_MIN min.
//
// NOTA: el saldo de la billetera MP NO se puede leer por OAuth (el endpoint de
// balance da 403 forbidden para cuentas personales) → la cuenta MP lleva saldo
// manual. Acá solo sincronizamos pagos recibidos (cobrador).
//
// La lógica por-usuario es la misma que mp-sync-movements (duplicada a propósito:
// son deploys independientes y no comparten módulos). Si cambia una, cambiar la otra.
//
// Endpoint: POST /functions/v1/mp-sync-cron
// Auth: verify_jwt = false (lo llama pg_cron)
// Response 200: { synced, skipped, errors, results }
// Secrets: MP_CLIENT_ID, MP_CLIENT_SECRET, MP_TOKEN_KEY
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const MP_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments/search";
const PAGE_LIMIT = 100;
const SKIP_RECENT_MIN = 30;

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: conns, error } = await admin
    .from("mp_connections")
    .select("owner_id, last_synced_at");
  if (error) return json({ error: error.message }, 500);

  const now = Date.now();
  const results: { owner: string; inserted?: number; error?: string }[] = [];
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const c of conns ?? []) {
    const recent =
      c.last_synced_at && now - new Date(c.last_synced_at).getTime() < SKIP_RECENT_MIN * 60 * 1000;
    if (recent) {
      skipped++;
      continue;
    }
    try {
      const r = await syncOwner(admin, c.owner_id, tokenKey, clientId, clientSecret);
      results.push({ owner: c.owner_id, inserted: r.inserted });
      synced++;
    } catch (e) {
      errors++;
      results.push({ owner: c.owner_id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({ synced, skipped, errors, results });
});

async function syncOwner(
  admin: Sb,
  ownerId: string,
  tokenKey: string,
  clientId: string,
  clientSecret: string,
): Promise<{ inserted: number }> {
  const { data: tokRows, error: tokErr } = await admin.rpc("mp_get_tokens", {
    p_owner: ownerId,
    p_key: tokenKey,
  });
  if (tokErr) throw new Error(tokErr.message);
  const tok = Array.isArray(tokRows) ? tokRows[0] : tokRows;
  if (!tok?.access_token) throw new Error("sin access_token");

  let accessToken: string = tok.access_token;
  const expMs = tok.expires_at ? new Date(tok.expires_at).getTime() : 0;
  if (tok.refresh_token && expMs && expMs - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshToken(admin, ownerId, clientId, clientSecret, tokenKey, tok.refresh_token);
    if (refreshed) accessToken = refreshed;
  }

  const accountId = await ensureMpAccount(admin, ownerId);

  const payments = await fetchPayments(accessToken);

  // Solo cobros reales aprobados (ventas a clientes). El token de cobrador trae
  // además money_transfer (transferencias entre cuentas propias / espejos
  // duplicados), investment (cuenta remunerada/rendimientos) y account_fund
  // (carga de saldo desde el banco por CVU): todos son plata propia moviéndose,
  // NO ingresos → se excluyen para no inflar el patrimonio ni duplicar montos.
  const rows = payments
    .filter((p) => p && p.id != null && typeof p.transaction_amount === "number")
    .filter((p) => p.status === "approved" && p.operation_type === "regular_payment")
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
    if (error) throw new Error(error.message);
    inserted = data?.length ?? 0;
  }

  await admin.from("mp_connections").update({ last_synced_at: new Date().toISOString() }).eq("owner_id", ownerId);
  return { inserted };
}

type MpPayment = {
  id?: number | string;
  status?: string | null;
  operation_type?: string | null;
  collector_id?: number | string | null;
  transaction_amount?: number;
  description?: string | null;
  payment_method_id?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  payer?: { id?: number | string | null; email?: string | null } | null;
};

async function fetchPayments(accessToken: string): Promise<MpPayment[]> {
  const url = new URL(MP_PAYMENTS_URL);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MP payments ${res.status}`);
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
      console.warn("[mp-sync-cron] refresh falló:", res.status, t);
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
    console.warn("[mp-sync-cron] refresh error:", e);
    return null;
  }
}

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
