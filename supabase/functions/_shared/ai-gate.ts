// ============================================
// Mi Platica — Portón de IA (Sprint 10: monetización)
// ============================================
// La IA es Pro. Antes de gastar tokens de Anthropic, las Edge Functions de IA
// llaman a requireProAi() para verificar SERVER-SIDE que el usuario tenga Pro
// activo + aplicar un límite diario por usuario (backstop de costo). Nunca confiar
// en el cliente para esto.
//
// Recibe un cliente supabase creado con el Authorization del request (RLS), para
// que auth.uid() resuelva al usuario dentro de las funciones SQL is_pro() /
// consume_ai_quota(). Devuelve una Response de error si NO debe seguir, o null si
// está habilitado.
//
// Sin Pro, antes de devolver 402 se intenta consumir 1 crédito de rewarded ad
// (consume_ai_reward_credit, migración 0013). Si el RPC no existe todavía o
// falla, se degrada al 402 de siempre (fail closed, nunca 500 por esto).
//
// Códigos: 402 pro_required · 429 rate_limited · 500 si falla el chequeo.

export const DAILY_AI_LIMIT = 50; // llamadas de IA por usuario por día

// deno-lint-ignore no-explicit-any
export async function requireProAi(supabase: any): Promise<Response | null> {
  const { data: pro, error: proErr } = await supabase.rpc("is_pro");
  if (proErr) {
    return gateJson({ error: "entitlement_check_failed", detail: proErr.message }, 500);
  }
  if (!pro) {
    const { data: credited, error: creditErr } = await supabase.rpc("consume_ai_reward_credit");
    if (creditErr || !credited) {
      return gateJson(
        { error: "pro_required", message: "Esta función es parte de Mi Plata Pro." },
        402,
      );
    }
  }

  const { data: allowed, error: quotaErr } = await supabase.rpc("consume_ai_quota", {
    p_limit: DAILY_AI_LIMIT,
  });
  if (quotaErr) {
    return gateJson({ error: "quota_check_failed", detail: quotaErr.message }, 500);
  }
  if (!allowed) {
    return gateJson(
      { error: "rate_limited", message: "Llegaste al límite diario de IA. Probá de nuevo mañana." },
      429,
    );
  }

  return null;
}

function gateJson(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
