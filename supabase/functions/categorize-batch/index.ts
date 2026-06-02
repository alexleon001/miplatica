// ============================================
// Mi Platica — Edge Function: categorize-batch
// ============================================
// Categoriza en LOTE los movimientos sin categoría del usuario (category IS NULL),
// con una sola llamada a Claude por tanda (mucho más barato que 1 llamada por tx).
// Pensado para los movimientos importados (Mercado Pago, CSV) que entran sin
// categoría. Usa el mismo diccionario de categorías que categorize-transaction.
//
// Endpoint: POST /functions/v1/categorize-batch
// Auth: verify_jwt = true (corre con el JWT del user; service_role para escribir).
// Body: {} (opcional { limit })
// Response 200: { categorized, remaining, chunks }
//
// Secrets: ANTHROPIC_API_KEY
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const MODEL = "claude-sonnet-4-6";
const MAX_TX = 200; // tope por invocación (el cliente puede volver a llamar)
const CHUNK = 50; // transacciones por llamada a Claude

const EXPENSE_CATS = [
  "food", "supermarket", "restaurants", "transport", "entertainment",
  "utilities", "health", "education", "clothing", "tech", "travel", "rent", "other",
];
const INCOME_CATS = ["salary", "freelance", "interest", "other_income"];
const NEUTRAL_CATS = ["transfers", "investment"];
const ALL_CATS = new Set([...EXPENSE_CATS, ...INCOME_CATS, ...NEUTRAL_CATS]);

const SYSTEM_PROMPT = `Sos un asistente financiero argentino. Categorizás transacciones en LOTE para una app de finanzas personales.

Categorías VÁLIDAS (no inventes otras):
- Gastos: food, supermarket, restaurants, transport, entertainment, utilities, health, education, clothing, tech, travel, rent, other
- Ingresos: salary, freelance, interest, other_income
- Neutros (sirven para gasto o ingreso): transfers, investment

Reglas:
- A cada transacción marcada [gasto] asignale una categoría de Gastos o Neutros.
- A cada transacción marcada [ingreso] asignale una categoría de Ingresos o Neutros.
- Normalizá comercios conocidos (DIA→supermarket, Uber→transport, farmacia/medicina→health, Netflix/Spotify→entertainment, seguros→utilities, etc.).
- Si es ambiguo, usá "other" (gasto) u "other_income" (ingreso).
- Respondé SOLO un array JSON de strings, una categoría por transacción, EN EL MISMO ORDEN, sin markdown ni texto extra. Ej: ["supermarket","health","transfers"]`;

type TxRow = {
  id: string;
  description: string | null;
  merchant: string | null;
  type: string; // "income" | "expense"
  amount_ars: number | null;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Server misconfigured: ANTHROPIC_API_KEY missing" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
  const ownerId = userData.user.id;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Movimientos sin categoría (más nuevos primero).
  const { data: rows, error: selErr } = await admin
    .from("transactions")
    .select("id, description, merchant, type, amount_ars")
    .eq("owner_id", ownerId)
    .is("category", null)
    .order("date", { ascending: false })
    .limit(MAX_TX);
  if (selErr) return json({ error: selErr.message }, 500);

  const txs = (rows ?? []) as TxRow[];
  if (txs.length === 0) return json({ categorized: 0, remaining: 0, chunks: 0 });

  const client = new Anthropic({ apiKey });

  // Acumula {id: category} de todas las tandas y actualiza al final.
  const updates: { id: string; category: string }[] = [];
  let chunks = 0;

  for (let start = 0; start < txs.length; start += CHUNK) {
    const chunk = txs.slice(start, start + CHUNK);
    chunks++;

    const list = chunk
      .map((t, i) => {
        const kind = t.type === "income" ? "ingreso" : "gasto";
        const desc = (t.description ?? "(sin descripción)").slice(0, 80);
        const merch = t.merchant ? ` — comercio: ${t.merchant.slice(0, 60)}` : "";
        return `${i + 1}. [${kind}] "${desc}"${merch}`;
      })
      .join("\n");

    const userMessage =
      `Categorizá estas ${chunk.length} transacciones. ` +
      `Devolvé un array JSON con EXACTAMENTE ${chunk.length} categorías, en el mismo orden:\n${list}`;

    let cats: string[] | null = null;
    try {
      const completion = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      });
      const block = completion.content.find((b) => b.type === "text");
      if (block && block.type === "text") cats = parseArray(block.text);
    } catch (e) {
      console.warn("[categorize-batch] Claude falló en chunk:", e);
    }

    // Mapea por posición; valida contra el grupo correcto; fallback seguro.
    chunk.forEach((t, i) => {
      const raw = cats?.[i];
      updates.push({ id: t.id, category: validCategory(raw, t.type) });
    });
  }

  // Aplica los updates (en paralelo por tandas chicas para no saturar).
  let categorized = 0;
  for (let i = 0; i < updates.length; i += 25) {
    const batch = updates.slice(i, i + 25);
    const res = await Promise.all(
      batch.map((u) =>
        admin.from("transactions").update({ category: u.category }).eq("id", u.id).eq("owner_id", ownerId),
      ),
    );
    categorized += res.filter((r) => !r.error).length;
  }

  const remaining = Math.max(0, txs.length - categorized);
  return json({ categorized, remaining, chunks });
});

function validCategory(raw: string | undefined, type: string): string {
  const c = (raw ?? "").trim().toLowerCase();
  const isIncome = type === "income";
  const allowed = isIncome
    ? new Set([...INCOME_CATS, ...NEUTRAL_CATS])
    : new Set([...EXPENSE_CATS, ...NEUTRAL_CATS]);
  if (ALL_CATS.has(c) && allowed.has(c)) return c;
  return isIncome ? "other_income" : "other";
}

// Parsea un array JSON de strings, tolerante a markdown fence.
function parseArray(text: string): string[] | null {
  let candidate = text.trim();
  if (candidate.startsWith("```")) {
    candidate = candidate.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
