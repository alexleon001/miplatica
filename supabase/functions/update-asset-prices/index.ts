// ============================================
// Mi Platica — Edge Function: update-asset-prices
// ============================================
// Levanta cotizaciones de mercado argentino (acciones, CEDEARs, bonos) desde
// data912.com (público, sin auth) + el dólar MEP desde dolarapi.com, y las
// upserta en public.asset_prices. Pensada para pg_cron cada 15 min en horario
// bursátil. Mismo patrón best-effort que fetch-exchange-rates: si una fuente
// falla, las demás siguen (no se rompe todo el batch).
//
// Endpoint: POST /functions/v1/update-asset-prices
// Auth: verify_jwt = false (cron interno + Authorization: Bearer <ANON_KEY>)
//
// Para invocarla manualmente:
//   curl -X POST '<SUPABASE_URL>/functions/v1/update-asset-prices' \
//        -H 'Authorization: Bearer <ANON_KEY>'
//
// NOTA: los endpoints de data912 son la fuente gratuita más estable al 2026-05;
// si cambian de forma, ajustar SOURCES / normalize sin tocar el resto.
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type AssetPriceRow = {
  ticker: string;
  name: string | null;
  price_ars: number | null;
  price_usd: number | null;
  variation_pct: number | null;
  fetched_at: string;
};

// Forma flexible de lo que devuelve data912 (campos varían por endpoint).
type RawQuote = Record<string, unknown>;

type Source = { url: string; market: "ARS" | "USD" };

// Mercado local cotiza en ARS; las ON suelen estar en USD.
const SOURCES: Source[] = [
  { url: "https://data912.com/live/arg_stocks", market: "ARS" },
  { url: "https://data912.com/live/arg_cedears", market: "ARS" },
  { url: "https://data912.com/live/arg_bonds", market: "ARS" },
  { url: "https://data912.com/live/arg_corp", market: "USD" },
];

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function pickFirst(q: RawQuote, keys: string[]): unknown {
  for (const k of keys) {
    if (q[k] != null) return q[k];
  }
  return null;
}

function normalize(q: RawQuote, market: "ARS" | "USD", now: string): AssetPriceRow | null {
  const ticker = String(pickFirst(q, ["symbol", "ticker", "Symbol"]) ?? "").trim().toUpperCase();
  if (!ticker) return null;

  const price = num(pickFirst(q, ["c", "price", "last", "ultimo", "close"]));
  const variation = num(pickFirst(q, ["pct_change", "variation", "var", "changePercent"]));
  const name = pickFirst(q, ["name", "nombre", "description"]);

  return {
    ticker,
    name: typeof name === "string" ? name : null,
    price_ars: market === "ARS" ? price : null,
    price_usd: market === "USD" ? price : null,
    variation_pct: variation,
    fetched_at: now,
  };
}

async function fetchSource(src: Source, now: string): Promise<AssetPriceRow[]> {
  try {
    const res = await fetch(src.url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[update-asset-prices] ${src.url} → ${res.status}`);
      return [];
    }
    const body = (await res.json()) as RawQuote[];
    if (!Array.isArray(body)) return [];
    return body
      .map((q) => normalize(q, src.market, now))
      .filter((r): r is AssetPriceRow => r != null && (r.price_ars != null || r.price_usd != null));
  } catch (e) {
    console.warn(`[update-asset-prices] ${src.url} falló:`, e);
    return [];
  }
}

// MEP desde dolarapi (la app lo trata como instrumento dolar_mep / usd_cash).
async function fetchMep(now: string): Promise<AssetPriceRow | null> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/bolsa");
    if (!res.ok) return null;
    const q = (await res.json()) as { venta?: number | null };
    const price = num(q.venta);
    if (price == null) return null;
    return { ticker: "MEP", name: "Dólar MEP", price_ars: price, price_usd: 1, variation_pct: null, fetched_at: now };
  } catch (e) {
    console.warn("[update-asset-prices] MEP falló:", e);
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const now = new Date().toISOString();

  const results = await Promise.all(SOURCES.map((s) => fetchSource(s, now)));
  const mep = await fetchMep(now);

  // Dedup por ticker (último gana). Distintos endpoints pueden repetir símbolos.
  const byTicker = new Map<string, AssetPriceRow>();
  for (const row of results.flat()) byTicker.set(row.ticker, row);
  if (mep) byTicker.set(mep.ticker, mep);

  const rows = [...byTicker.values()];
  if (rows.length === 0) {
    return json({ ok: false, error: "Ninguna fuente devolvió cotizaciones", updated: 0 }, 502);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { error } = await supabase.from("asset_prices").upsert(rows, { onConflict: "ticker" });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, updated: rows.length, sources: SOURCES.length + (mep ? 1 : 0) });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
