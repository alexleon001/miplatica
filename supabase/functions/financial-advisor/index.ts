// ============================================
// Mi Platica — Edge Function: financial-advisor
// ============================================
// Chat con un asesor financiero argentino. Arma el contexto financiero del
// usuario (RLS vía el Authorization del request) y se lo pasa a Claude con
// prompt caching sobre el system persona.
//
// Endpoint: POST /functions/v1/financial-advisor
// Auth: verify_jwt = true (requiere user logueado)
//
// Body:
// {
//   "messages": [
//     { "role": "user", "content": "¿en qué me conviene ahorrar?" },
//     { "role": "assistant", "content": "..." },
//     { "role": "user", "content": "¿y plazo fijo?" }
//   ]
// }
//
// Response 200: { "reply": "texto del asesor" }
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const MODEL = "claude-sonnet-4-5-20250929";
// NOTA: cuando claude-sonnet-4-6 esté disponible público, cambiar este id.

const PERSONA = `Sos "el asesor de Mi Platica": un asesor financiero argentino, cercano y honesto. Hablás en español rioplatense, tratás de vos al usuario.

Contexto del país (tenelo siempre presente):
- Argentina tiene inflación alta: un rendimiento nominal positivo puede ser una pérdida real. Cuando hables de rendimientos, distinguí nominal vs. real (contra inflación) si tenés el dato.
- Hay varios dólares: oficial, MEP, blue, CCL, tarjeta. Aclarás a cuál te referís.
- Instrumentos típicos: plazo fijo (UVA o tradicional), FCI money market, CEDEARs, acciones, bonos, ON, LECAP, dólar MEP/billete, cripto.

Reglas de comportamiento:
- Usá SOLO los datos del contexto financiero del usuario que te paso abajo. NO inventes saldos, posiciones ni números que no estén ahí.
- Si te falta un dato para responder bien, decilo y pedí que lo cargue en la app.
- Sé concreto y accionable: respuestas cortas, en puntos cuando ayude. Nada de relleno.
- No prometas rendimientos ni des certezas de mercado. Sos orientativo, no garantizás resultados. Si el tema es delicado (impuestos, decisiones grandes), sugerí consultar a un profesional.
- Montos: formato argentino (puntos de miles, coma decimal). Aclarás la moneda (ARS/USD).
- No respondas cosas fuera de finanzas personales del usuario; redirigí amablemente.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "Server misconfigured: ANTHROPIC_API_KEY missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = (body.messages ?? []).filter(
    (m) =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );
  if (messages.length === 0) {
    return json({ error: "Required: messages (non-empty)" }, 400);
  }

  // Cliente con el JWT del usuario → RLS filtra todo a sus propias filas.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let contextBlock: string;
  try {
    contextBlock = await buildFinancialContext(supabase);
  } catch (e) {
    return json(
      { error: "Failed to build user context", detail: e instanceof Error ? e.message : String(e) },
      502,
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        // Bloque estable → cacheable (ahorra tokens entre turnos y usuarios).
        { type: "text", text: PERSONA, cache_control: { type: "ephemeral" } },
        // Contexto del usuario (cambia por usuario; estable dentro de la charla).
        { type: "text", text: contextBlock },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = completion.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "Empty model response" }, 502);
    }

    return json({ reply: textBlock.text });
  } catch (e) {
    return json(
      { error: "Claude API failed", detail: e instanceof Error ? e.message : String(e) },
      502,
    );
  }
});

// Arma un snapshot financiero compacto en texto para inyectar como contexto.
async function buildFinancialContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<string> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [profile, netWorth, accounts, txs, investments, debts, budgets, rates] =
    await Promise.all([
      supabase.from("profiles").select("name, monthly_income_ars, preferred_usd_type, currency_display").maybeSingle(),
      supabase.from("v_net_worth").select("*").maybeSingle(),
      supabase.from("accounts").select("name, type, currency, balance_amount").eq("is_active", true),
      supabase
        .from("transactions")
        .select("date, type, category, amount_ars, description")
        .gte("date", since)
        .order("date", { ascending: false })
        .limit(40),
      supabase
        .from("investments")
        .select("name, type, ticker, currency, current_value_ars, current_value_usd, profit_loss_pct")
        .order("current_value_ars", { ascending: false }),
      supabase.from("debts").select("name, type, currency, remaining_amount, interest_rate, monthly_payment, next_payment_date").eq("is_active", true),
      supabase.from("budgets").select("category, limit_ars, spent_ars").eq("year", year).eq("month", month),
      supabase.from("exchange_rates").select("date, oficial, mep, blue, ccl, tarjeta").order("date", { ascending: false }).limit(1).maybeSingle(),
    ]);

  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

  const lines: string[] = ["=== CONTEXTO FINANCIERO DEL USUARIO ==="];
  lines.push(`Fecha de hoy: ${now.toISOString().slice(0, 10)}`);

  const p = profile.data;
  if (p) {
    lines.push(
      `\nPerfil: ${p.name ?? "(sin nombre)"} · ingreso mensual declarado: ${fmt(p.monthly_income_ars)} ARS · dólar preferido: ${(p.preferred_usd_type ?? "mep").toUpperCase()} · vista: ${p.currency_display ?? "both"}`,
    );
  }

  const r = rates.data;
  if (r) {
    lines.push(
      `\nTipos de cambio (${r.date}): oficial ${fmt(r.oficial)} · MEP ${fmt(r.mep)} · blue ${fmt(r.blue)} · CCL ${fmt(r.ccl)} · tarjeta ${fmt(r.tarjeta)} (ARS por USD)`,
    );
  }

  const nw = netWorth.data;
  if (nw) {
    lines.push(
      `\nPatrimonio neto: ${fmt(nw.net_ars)} ARS / ${fmt(nw.net_usd)} USD`,
      `  - Cuentas: ${fmt(nw.accounts_ars)} ARS · Inversiones: ${fmt(nw.investments_ars)} ARS · Deudas: ${fmt(nw.debts_ars)} ARS`,
    );
  }

  const accs = accounts.data ?? [];
  if (accs.length) {
    lines.push("\nCuentas:");
    for (const a of accs) lines.push(`  - ${a.name} (${a.type}): ${fmt(a.balance_amount)} ${a.currency}`);
  }

  const invs = investments.data ?? [];
  if (invs.length) {
    lines.push("\nInversiones:");
    for (const i of invs) {
      lines.push(
        `  - ${i.name}${i.ticker ? ` (${i.ticker})` : ""} [${i.type}]: ${fmt(i.current_value_ars)} ARS${i.profit_loss_pct != null ? ` · P&L ${i.profit_loss_pct > 0 ? "+" : ""}${i.profit_loss_pct.toFixed(1)}%` : ""}`,
      );
    }
  }

  const dbs = debts.data ?? [];
  if (dbs.length) {
    lines.push("\nDeudas:");
    for (const d of dbs) {
      lines.push(
        `  - ${d.name} [${d.type}]: saldo ${fmt(d.remaining_amount)} ${d.currency}${d.interest_rate != null ? ` · TNA ${d.interest_rate}%` : ""}${d.monthly_payment != null ? ` · cuota ${fmt(d.monthly_payment)}` : ""}${d.next_payment_date ? ` · próx. vto ${d.next_payment_date}` : ""}`,
      );
    }
  }

  const buds = budgets.data ?? [];
  if (buds.length) {
    lines.push(`\nPresupuestos del mes (${month}/${year}):`);
    for (const b of buds) {
      const pct = b.limit_ars > 0 ? Math.round((b.spent_ars / b.limit_ars) * 100) : 0;
      lines.push(`  - ${b.category}: gastado ${fmt(b.spent_ars)} de ${fmt(b.limit_ars)} ARS (${pct}%)`);
    }
  }

  const t = txs.data ?? [];
  if (t.length) {
    lines.push(`\nÚltimos movimientos (${t.length}, desde ${since}):`);
    for (const x of t.slice(0, 30)) {
      lines.push(`  - ${x.date} ${x.type} ${x.category ?? "?"}: ${fmt(x.amount_ars)} ARS${x.description ? ` — ${x.description}` : ""}`);
    }
  } else {
    lines.push("\nNo hay movimientos en los últimos 30 días.");
  }

  return lines.join("\n");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
