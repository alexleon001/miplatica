// ============================================
// Mi Platica — Edge Function: group-reminder
// ============================================
// Recordatorio ad-hoc por mail al deudor de un saldo del grupo (botón "Recordar"
// en la app). Verifica que el que llama sea miembro activo del grupo.
//
// Endpoint: POST /functions/v1/group-reminder
// Auth: verify_jwt = true
// Body: { "debtor_id": "<uuid>", "creditor_id": "<uuid>", "amount": number }
// Secrets: RESEND_API_KEY, RESEND_FROM
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reminderEmail, sendEmail } from "../_shared/email.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  let body: { debtor_id?: string; creditor_id?: string; amount?: number } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.debtor_id || !body.creditor_id || !(body.amount && body.amount > 0)) {
    return json({ error: "debtor_id, creditor_id and amount required" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);

  const { data: debtor, error: dErr } = await admin
    .from("group_members")
    .select("id, group_id, email, display_name")
    .eq("id", body.debtor_id)
    .single();
  if (dErr || !debtor) return json({ error: "Debtor not found" }, 404);
  if (!debtor.email) return json({ error: "Debtor has no email" }, 400);

  // El acreedor tiene que ser del mismo grupo.
  const { data: creditor } = await admin
    .from("group_members")
    .select("display_name, group_id")
    .eq("id", body.creditor_id)
    .single();
  if (!creditor || creditor.group_id !== debtor.group_id) return json({ error: "Members not in same group" }, 400);

  // Autorización: el que llama tiene que ser miembro del grupo.
  const { data: isMember } = await userClient.rpc("is_group_member", { p_group: debtor.group_id });
  if (isMember !== true) return json({ error: "Forbidden" }, 403);

  const { data: group } = await admin
    .from("expense_groups")
    .select("name")
    .eq("id", debtor.group_id)
    .single();

  const tmpl = reminderEmail({
    groupName: group?.name ?? "tu grupo",
    debtorName: debtor.display_name,
    amount: body.amount,
    toName: creditor.display_name,
  });

  const result = await sendEmail({ to: debtor.email, subject: tmpl.subject, html: tmpl.html });
  if (!result.ok) return json({ error: result.error, sent: false }, 502);

  await admin.from("group_members").update({ last_reminded_at: new Date().toISOString() }).eq("id", debtor.id);
  return json({ sent: true });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
