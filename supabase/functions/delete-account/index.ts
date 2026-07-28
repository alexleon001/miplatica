// ============================================
// Mi Plata — Edge Function: delete-account
// ============================================
// Borra la cuenta del usuario que llama y TODOS sus datos personales.
// Requisito de Google Play: "Apps que permiten crear una cuenta deben permitir
// solicitar su eliminación" (in-app + URL pública).
//
// Cómo borra: auth.admin.deleteUser(uid). Todas las tablas de datos personales
// referencian auth.users(id) con `on delete cascade` (profiles, accounts,
// transactions, investments, debts, savings_goals, budgets, projection_*,
// mp_connections, entitlements, ai_usage_daily, ai_reward_credits) → se van en
// la misma transacción. En gastos compartidos: los grupos que creó el usuario se
// borran en cascada; en los grupos ajenos su miembro queda "fantasma"
// (group_members.user_id → null) y los gastos que cargó sobreviven con
// created_by null (ver migración 0022) para no romper los saldos del resto.
//
// Endpoint: POST /functions/v1/delete-account
// Auth: verify_jwt = true (solo podés borrarte a vos mismo: el uid sale del JWT,
//       nunca del body)
// Body: { "confirm": "ELIMINAR" }
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CONFIRM_WORD = "ELIMINAR";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  let body: { confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  // Doble confirmación: el cliente tiene que mandar la palabra explícita. Evita
  // que un tap/llamada accidental borre una cuenta.
  if (body.confirm !== CONFIRM_WORD) {
    return json({ error: `confirm must be "${CONFIRM_WORD}"` }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: uErr } = await userClient.auth.getUser();
  if (uErr || !userData.user) return json({ error: "Unauthorized" }, 401);
  const uid = userData.user.id;

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Los grupos donde el usuario es el dueño se borran en cascada junto con la
  // cuenta. Lo dejamos logueado para poder auditar reclamos ("se borró el grupo
  // del viaje") sin guardar nada del usuario.
  const { count: ownedGroups } = await admin
    .from("expense_groups")
    .select("id", { count: "exact", head: true })
    .eq("created_by", uid);

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    console.error("delete-account failed", { uid, message: delErr.message });
    return json({ error: "No pudimos borrar la cuenta. Escribinos y lo hacemos a mano." }, 500);
  }

  console.log("account deleted", { uid, ownedGroups: ownedGroups ?? 0 });
  return json({ deleted: true });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
