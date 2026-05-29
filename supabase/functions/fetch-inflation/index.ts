// ============================================
// Mi Platica — Edge Function: fetch-inflation
// ============================================
// Consume https://api.argentinadatos.com (público, sin auth) y upserta la serie
// de IPC mensual en public.inflation. Pensada para correr vía pg_cron un par de
// veces al mes (el dato sale ~mediados del mes siguiente). Idempotente.
//
// Endpoint: POST /functions/v1/fetch-inflation
// Auth: verify_jwt = false (cron interno keyless)
//
// Para invocarla manualmente:
//   curl -X POST '<SUPABASE_URL>/functions/v1/fetch-inflation' \
//        -H 'Authorization: Bearer <ANON_KEY>'
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SOURCE = "https://api.argentinadatos.com/v1/finanzas/indices/inflacion";

type InflacionPoint = {
  fecha: string;  // "YYYY-MM-DD" (fin de mes)
  valor: number;  // inflación mensual en %
};

// "2026-04-30" -> "2026-04-01" (primer día del mes, PK normalizada).
function monthStart(fecha: string): string | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(fecha);
  return m ? `${m[1]}-${m[2]}-01` : null;
}

Deno.serve(async (_req: Request) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const res = await fetch(SOURCE);
  if (!res.ok) {
    return json({ error: `argentinadatos.com responded ${res.status}` }, 502);
  }

  const points = (await res.json()) as InflacionPoint[];

  const rows = points
    .map((p) => {
      const month = monthStart(p.fecha);
      return month != null && typeof p.valor === "number" && Number.isFinite(p.valor)
        ? { month, ipc: p.valor, fetched_at: new Date().toISOString() }
        : null;
    })
    .filter((r): r is { month: string; ipc: number; fetched_at: string } => r != null);

  if (rows.length === 0) {
    return json({ error: "No valid inflation points parsed from source" }, 502);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("inflation").upsert(rows, { onConflict: "month" });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, upserted: rows.length, latest: rows[rows.length - 1] });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
