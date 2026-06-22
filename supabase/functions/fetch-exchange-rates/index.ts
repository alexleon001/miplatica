// ============================================
// Mi Platica — Edge Function: fetch-exchange-rates
// ============================================
// Consume dolarapi.com (público, sin auth) y upserta en public.exchange_rates.
// Trae cotizaciones de Argentina (oficial/blue/mep/ccl/tarjeta) Y Venezuela
// (BCV/paralelo) y las mergea en la MISMA fila del día (la tabla es global, una
// fila por fecha compartida por todos los usuarios). El cliente elige la columna
// por país/usdType. Pensada para correr vía pg_cron cada 30 min.
//
// Endpoint: POST /functions/v1/fetch-exchange-rates
// Auth: verify_jwt = false (cron interno + Authorization: Bearer <SUPABASE_ANON>)
//
// Para invocarla manualmente:
//   curl -X POST '<SUPABASE_URL>/functions/v1/fetch-exchange-rates' \
//        -H 'Authorization: Bearer <ANON_KEY>'
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type DolarApiQuote = {
  casa?: string;         // AR: 'oficial' | 'blue' | 'bolsa' (=mep) | 'contadoconliqui' (=ccl) | 'tarjeta'
  fuente?: string;       // VE: 'oficial' (=BCV) | 'paralelo'
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio?: number | null; // VE expone el valor acá (compra/venta vienen null)
  fechaActualizacion: string;
};

// Argentina: dolarapi.com/v1/dolares → casa → columna
const AR_CASA_TO_COLUMN: Record<string, string> = {
  oficial: "oficial",
  blue: "blue",
  bolsa: "mep",
  contadoconliqui: "ccl",
  tarjeta: "tarjeta",
};

// Venezuela: ve.dolarapi.com/v1/dolares → fuente → columna
const VE_FUENTE_TO_COLUMN: Record<string, string> = {
  oficial: "bcv",
  paralelo: "paralelo",
};

Deno.serve(async (_req: Request) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const row: Record<string, unknown> = {
    date: new Date().toISOString().slice(0, 10),
    fetched_at: new Date().toISOString(),
  };

  // Best-effort por país: si un proveedor falla, seguimos con el otro en vez de
  // romper toda la actualización del día.
  const errors: string[] = [];
  await Promise.all([
    fetchInto(row, "https://dolarapi.com/v1/dolares", AR_CASA_TO_COLUMN, (q) => q.casa, (q) => q.venta).catch(
      (e) => errors.push(`AR: ${e instanceof Error ? e.message : String(e)}`),
    ),
    // VE expone el valor en `promedio` (compra/venta = null) → fallback a venta.
    fetchInto(row, "https://ve.dolarapi.com/v1/dolares", VE_FUENTE_TO_COLUMN, (q) => q.fuente, (q) => q.promedio ?? q.venta).catch(
      (e) => errors.push(`VE: ${e instanceof Error ? e.message : String(e)}`),
    ),
  ]);

  // Solo date/fetched_at → ningún proveedor respondió con tasas: error.
  if (Object.keys(row).length <= 2) {
    return json({ error: "All rate sources failed", detail: errors }, 502);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(row, { onConflict: "date" });

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, updated: row, errors });
});

// Trae un endpoint dolarapi y escribe las tasas en `row` según el mapa de
// columnas. `keyOf` extrae el identificador del quote (casa/fuente); `valueOf`
// extrae el valor (venta en AR, promedio en VE).
async function fetchInto(
  row: Record<string, unknown>,
  url: string,
  columnMap: Record<string, string>,
  keyOf: (q: DolarApiQuote) => string | undefined,
  valueOf: (q: DolarApiQuote) => number | null | undefined,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const quotes = (await res.json()) as DolarApiQuote[];
  for (const q of quotes) {
    const col = columnMap[keyOf(q) ?? ""];
    const val = valueOf(q);
    if (col && val != null) row[col] = val;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
