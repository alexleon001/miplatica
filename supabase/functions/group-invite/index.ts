// ============================================
// Mi Platica — Edge Function: group-invite
// ============================================
// Manda el mail de invitación a un miembro "fantasma" de un grupo de gastos
// compartidos. Lo dispara el cliente tras crear el miembro (useInviteMember).
//
// Seguridad: verifica que el que llama sea miembro activo del grupo (RLS vía
// is_group_member con el Authorization del request). Los datos sensibles se leen
// con service_role para poder armar el mail.
//
// Endpoint: POST /functions/v1/group-invite
// Auth: verify_jwt = true
// Body: { "member_id": "<uuid>" }
// Secrets: RESEND_API_KEY, RESEND_FROM
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { inviteEmail, sendEmail } from "../_shared/email.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  let body: { member_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.member_id) return json({ error: "member_id required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Cliente con la sesión del usuario → RLS aplica (para verificar membresía).
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);

  // Datos del miembro a invitar (service_role para leer email/token).
  const { data: member, error: mErr } = await admin
    .from("group_members")
    .select("id, group_id, email, display_name, invite_token")
    .eq("id", body.member_id)
    .single();
  if (mErr || !member) return json({ error: "Member not found" }, 404);
  if (!member.email) return json({ error: "Member has no email" }, 400);

  // Autorización: el que llama tiene que ser miembro activo del grupo.
  const { data: isMember } = await userClient.rpc("is_group_member", { p_group: member.group_id });
  if (isMember !== true) return json({ error: "Forbidden" }, 403);

  // Nombre del grupo + de quien invita.
  const { data: group } = await admin
    .from("expense_groups")
    .select("name")
    .eq("id", member.group_id)
    .single();
  const { data: inviter } = await admin
    .from("group_members")
    .select("display_name")
    .eq("group_id", member.group_id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const link = `miplatica://groups/${member.group_id}?token=${member.invite_token}`;
  const tmpl = inviteEmail({
    groupName: group?.name ?? "tu grupo",
    inviterName: inviter?.display_name ?? "Alguien",
    link,
  });

  const result = await sendEmail({ to: member.email, subject: tmpl.subject, html: tmpl.html });
  if (!result.ok) return json({ error: result.error, sent: false }, 502);
  return json({ sent: true });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
