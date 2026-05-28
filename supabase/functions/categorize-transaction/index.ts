// ============================================
// Mi Platica — Edge Function: categorize-transaction
// ============================================
// Recibe los datos de una transacción y devuelve categoría sugerida + metadata.
// Usa Claude Sonnet 4.6 con prompt caching sobre el system prompt (categorías).
//
// Endpoint: POST /functions/v1/categorize-transaction
// Auth: verify_jwt = true (requiere user logueado)
//
// Body:
// {
//   "description": "uber a casa",
//   "amount": 2350,
//   "currency": "ARS",
//   "account_name": "Mercado Pago"
// }
//
// Response 200:
// {
//   "category": "transport",
//   "subcategory": "uber",
//   "merchant_normalized": "Uber",
//   "confidence": "high",
//   "is_recurrent": false,
//   "notes": null
// }
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const MODEL = "claude-sonnet-4-5-20250929";
// NOTA: cuando claude-sonnet-4-6 esté disponible público, cambiar este id.

const CATEGORY_IDS = [
  "food", "supermarket", "restaurants", "transport", "entertainment",
  "utilities", "health", "education", "clothing", "tech", "travel",
  "rent", "other",
  "salary", "freelance", "interest", "other_income",
  "transfers", "investment",
];

const SYSTEM_PROMPT = `Sos un asistente financiero argentino. Categorizás transacciones para una app de finanzas personales.

Categorías VÁLIDAS (no inventes otras):
- Gastos: food, supermarket, restaurants, transport, entertainment, utilities, health, education, clothing, tech, travel, rent, other
- Ingresos: salary, freelance, interest, other_income
- Movimientos: transfers, investment

Reglas:
- Respondé SOLO un JSON válido, sin markdown, sin texto adicional.
- "category" debe estar en la lista de arriba.
- "merchant_normalized": normalizá el nombre del comercio (ej "MERCADOPAGO*UBER" → "Uber"). Si no hay merchant claro, null.
- "confidence": "high" si estás seguro, "medium" si dudás entre 2, "low" si es ambiguo.
- "is_recurrent": true si parece un gasto/ingreso periódico (alquiler, sueldo, Netflix, etc).
- "notes": observación útil para el usuario en español argentino, o null.

Formato exacto:
{
  "category": "transport",
  "subcategory": "uber",
  "merchant_normalized": "Uber",
  "confidence": "high",
  "is_recurrent": false,
  "notes": null
}`;

type CategorizeRequest = {
  description?: string;
  amount?: number;
  currency?: string;
  account_name?: string;
};

type CategorizeResponse = {
  category: string;
  subcategory: string | null;
  merchant_normalized: string | null;
  confidence: "high" | "medium" | "low";
  is_recurrent: boolean;
  notes: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "Server misconfigured: ANTHROPIC_API_KEY missing" }, 500);
  }

  let body: CategorizeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.description || body.amount == null || !body.currency) {
    return json({ error: "Required: description, amount, currency" }, 400);
  }

  const client = new Anthropic({ apiKey });

  const userMessage =
    `Transacción a categorizar:\n` +
    `- Descripción: "${body.description}"\n` +
    `- Monto: ${body.amount} ${body.currency}\n` +
    `- Cuenta: ${body.account_name ?? "(no especificada)"}\n` +
    `\nDevolvé el JSON con la categorización.`;

  try {
    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      // Cache del system prompt: cambia poco, ahorra tokens.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = completion.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "Empty model response" }, 502);
    }

    const parsed = parseJsonStrict(textBlock.text);
    if (!parsed) {
      return json({ error: "Model returned invalid JSON", raw: textBlock.text }, 502);
    }

    if (!CATEGORY_IDS.includes(parsed.category)) {
      // Fallback seguro: si el modelo inventó una categoría, usá "other".
      parsed.category = parsed.category && CATEGORY_IDS.includes(parsed.category)
        ? parsed.category
        : "other";
    }

    return json(parsed satisfies CategorizeResponse);
  } catch (e) {
    return json(
      { error: "Claude API failed", detail: e instanceof Error ? e.message : String(e) },
      502,
    );
  }
});

// Parsea JSON estricto, tolerante a markdown fence.
function parseJsonStrict(text: string): CategorizeResponse | null {
  let candidate = text.trim();
  if (candidate.startsWith("```")) {
    candidate = candidate.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  try {
    return JSON.parse(candidate) as CategorizeResponse;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
