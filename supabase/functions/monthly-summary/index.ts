// ============================================
// Mi Platica — Edge Function: monthly-summary
// ============================================
// Genera un resumen en lenguaje natural del mes: en qué gastaste más, cómo venís
// vs. el mes anterior, e impacto de la inflación. Agrega los números server-side
// (RLS vía el Authorization del request) y se los pasa a Claude con prompt
// caching sobre el system persona.
//
// Endpoint: POST /functions/v1/monthly-summary
// Auth: verify_jwt = true
// Body (opcional): { "period": "YYYY-MM" }  // default = mes en curso
// Response 200: { "summary": "texto", "period": "YYYY-MM" }
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const MODEL = "claude-sonnet-4-6";

const PERSONA = `Sos "el asesor de Mi Platica": un asesor financiero argentino, cercano y honesto. Hablás en español rioplatense, tratás de vos al usuario.

Tu tarea: escribir un RESUMEN BREVE del mes financiero del usuario, a partir de los números que te paso. Reglas:
- Arrancá con una frase de panorama (¿gastó más o menos que el mes pasado? ¿le alcanzó el ingreso?).
- Destacá las 2-3 categorías donde más gastó y los cambios fuertes vs. el mes anterior (subas/bajas notables).
- Si la suba de gasto es menor o mayor que la inflación del mes, mencionalo (ej: "gastaste 8% más, pero la inflación fue 4%, así que en términos reales subió").
- Cerrá con UN consejo concreto y accionable para el mes que viene.
- Tono humano y directo, NADA de relleno. 120-180 palabras. Usá viñetas para las categorías.
- Montos en formato argentino (puntos de miles), aclarando ARS. No inventes números: usá SOLO los del contexto.
- No uses encabezados markdown grandes; texto plano con viñetas "- " está bien.`;

// Labels de categorías (espejo de lib/categories.ts) para que el resumen lea
// lindo. Si aparece un id desconocido, se usa el id crudo.
const CATEGORY_LABELS: Record<string, string> = {
  food: "Comida", supermarket: "Supermercado", restaurants: "Restaurantes",
  transport: "Transporte", entertainment: "Entretenimiento", utilities: "Servicios",
  health: "Salud", education: "Educación", clothing: "Ropa", tech: "Tecnología",
  travel: "Viajes", rent: "Alquiler", other: "Otros",
  salary: "Sueldo", freelance: "Freelance", interest: "Intereses", other_income: "Otros ingresos",
  transfers: "Transferencia", investment: "Inversión",
};

const pad = (n: number) => String(n).padStart(2, "0");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Server misconfigured: ANTHROPIC_API_KEY missing" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  let body: { period?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body opcional
  }

  // Período objetivo (default mes en curso) + período anterior para comparar.
  const now = new Date();
  const period = /^\d{4}-\d{2}$/.test(body.period ?? "")
    ? body.period!
    : `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
  const [py, pm] = period.split("-").map(Number);
  const prev = new Date(Date.UTC(py, pm - 2, 1));
  const prevPeriod = `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}`;
  const since = `${prevPeriod}-01`;
  const until = `${period}-31`; // cota superior holgada (date string compare)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let contextBlock: string;
  try {
    contextBlock = await buildSummaryContext(supabase, period, prevPeriod, since, until);
  } catch (e) {
    return json({ error: "Failed to build context", detail: e instanceof Error ? e.message : String(e) }, 502);
  }

  const client = new Anthropic({ apiKey });
  try {
    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: [
        { type: "text", text: PERSONA, cache_control: { type: "ephemeral" } },
        { type: "text", text: contextBlock },
      ],
      messages: [{ role: "user", content: `Hacé el resumen del mes ${period}.` }],
    });
    const textBlock = completion.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return json({ error: "Empty model response" }, 502);
    return json({ summary: textBlock.text, period });
  } catch (e) {
    return json({ error: "Claude API failed", detail: e instanceof Error ? e.message : String(e) }, 502);
  }
});

async function buildSummaryContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  period: string,
  prevPeriod: string,
  since: string,
  until: string,
): Promise<string> {
  const [profile, txsRes, rates, inflation] = await Promise.all([
    supabase.from("profiles").select("name, monthly_income_ars").maybeSingle(),
    supabase
      .from("transactions")
      .select("date, type, category, amount_ars")
      .gte("date", since)
      .lte("date", until)
      .limit(2000),
    supabase.from("exchange_rates").select("mep").order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("inflation").select("month, ipc").order("month", { ascending: false }).limit(6),
  ]);

  const fmt = (n: number) => Math.round(n).toLocaleString("es-AR");
  const txs: { date: string; type: string; category: string | null; amount_ars: number | null }[] =
    txsRes.data ?? [];

  // Agregados por período.
  type Agg = { expenseByCat: Record<string, number>; expenseTotal: number; incomeTotal: number };
  const empty = (): Agg => ({ expenseByCat: {}, expenseTotal: 0, incomeTotal: 0 });
  const cur = empty();
  const old = empty();

  for (const t of txs) {
    const p = (t.date ?? "").slice(0, 7);
    const bucket = p === period ? cur : p === prevPeriod ? old : null;
    if (!bucket) continue;
    const amt = Number(t.amount_ars ?? 0);
    if (t.type === "expense") {
      bucket.expenseTotal += amt;
      const cat = t.category ?? "other";
      bucket.expenseByCat[cat] = (bucket.expenseByCat[cat] ?? 0) + amt;
    } else if (t.type === "income") {
      bucket.incomeTotal += amt;
    }
  }

  const lines: string[] = ["=== DATOS DEL MES PARA EL RESUMEN ==="];
  const p = profile.data;
  const declaredIncome = Number(p?.monthly_income_ars ?? 0);
  lines.push(`Usuario: ${p?.name ?? "(sin nombre)"}`);
  lines.push(`Mes a resumir: ${period} · mes anterior: ${prevPeriod}`);
  lines.push(`Ingreso mensual declarado en el perfil: ${fmt(declaredIncome)} ARS`);

  const curIncome = cur.incomeTotal > 0 ? cur.incomeTotal : declaredIncome;
  lines.push(`\nGasto total ${period}: ${fmt(cur.expenseTotal)} ARS`);
  lines.push(`Gasto total ${prevPeriod}: ${fmt(old.expenseTotal)} ARS`);
  if (old.expenseTotal > 0) {
    const delta = ((cur.expenseTotal - old.expenseTotal) / old.expenseTotal) * 100;
    lines.push(`Variación de gasto vs. mes anterior: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`);
  }
  lines.push(`Ingresos registrados ${period}: ${fmt(cur.incomeTotal)} ARS (si es 0, usá el ingreso declarado: ${fmt(declaredIncome)} ARS)`);
  lines.push(`Balance del mes (ingreso − gasto): ${fmt(curIncome - cur.expenseTotal)} ARS`);

  // Top categorías del mes con su comparación contra el mes anterior.
  const sorted = Object.entries(cur.expenseByCat).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    lines.push(`\nGasto por categoría (${period}, de mayor a menor):`);
    for (const [cat, amt] of sorted) {
      const label = CATEGORY_LABELS[cat] ?? cat;
      const prevAmt = old.expenseByCat[cat] ?? 0;
      const share = cur.expenseTotal > 0 ? Math.round((amt / cur.expenseTotal) * 100) : 0;
      let cmp = "";
      if (prevAmt > 0) {
        const d = ((amt - prevAmt) / prevAmt) * 100;
        cmp = ` · vs ${prevPeriod}: ${d >= 0 ? "+" : ""}${d.toFixed(0)}% (era ${fmt(prevAmt)})`;
      } else if (amt > 0) {
        cmp = ` · nuevo gasto este mes`;
      }
      lines.push(`  - ${label}: ${fmt(amt)} ARS (${share}% del gasto)${cmp}`);
    }
  } else {
    lines.push(`\nNo hay gastos registrados en ${period}.`);
  }

  const r = rates.data;
  if (r?.mep) lines.push(`\nDólar MEP actual: ${fmt(Number(r.mep))} ARS/USD (para referencia si hablás en USD)`);

  // Inflación del mes a resumir (o la más reciente disponible).
  const inf = (inflation.data ?? []).filter((x: { ipc: number | null }) => x.ipc != null);
  const periodInf = inf.find((x: { month: string }) => (x.month ?? "").slice(0, 7) === period) ?? inf[0];
  if (periodInf) {
    lines.push(
      `\nInflación IPC del mes ${(periodInf.month ?? "").slice(0, 7)}: ${Number(periodInf.ipc).toFixed(1)}% (comparala contra la suba de gasto para hablar de términos reales).`,
    );
  }

  return lines.join("\n");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
