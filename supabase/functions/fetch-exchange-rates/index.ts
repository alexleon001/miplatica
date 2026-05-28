// ============================================
// Mi Platica — Edge Function: fetch-exchange-rates
// ============================================
// Consume https://dolarapi.com (público, sin auth) y upserta en
// public.exchange_rates. Pensada para ejecutarse vía pg_cron cada 30 min.
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
  casa: string;          // 'oficial' | 'blue' | 'bolsa' (=mep) | 'contadoconliqui' (=ccl) | 'tarjeta' | ...
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
};

const CASA_TO_COLUMN: Record<string, string> = {
  oficial: "oficial",
  blue: "blue",
  bolsa: "mep",
  contadoconliqui: "ccl",
  tarjeta: "tarjeta",
};

Deno.serve(async (_req: Request) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const res = await fetch("https://dolarapi.com/v1/dolares");
  if (!res.ok) {
    return json({ error: `dolarapi.com responded ${res.status}` }, 502);
  }

  const quotes = (await res.json()) as DolarApiQuote[];

  const row: Record<string, unknown> = {
    date: new Date().toISOString().slice(0, 10),
    fetched_at: new Date().toISOString(),
  };

  for (const q of quotes) {
    const col = CASA_TO_COLUMN[q.casa];
    if (col && q.venta != null) row[col] = q.venta;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(row, { onConflict: "date" });

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, updated: row });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
