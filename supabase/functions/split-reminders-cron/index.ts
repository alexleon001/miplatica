// ============================================
// Mi Platica — Edge Function: split-reminders-cron
// ============================================
// Recorre todos los grupos de gastos compartidos, calcula los saldos, y manda un
// recordatorio por mail a cada deudor (con email) que tenga saldo pendiente.
// Throttle: no recuerda al mismo deudor más de 1 vez cada REMIND_EVERY_DAYS días
// (columna group_members.last_reminded_at). Pensada para pg_cron.
//
// La matemática de balances/simplificación es un espejo de lib/splits.ts (acá no
// compartimos módulos con el cliente). Si cambia una, revisar la otra.
//
// Endpoint: POST /functions/v1/split-reminders-cron
// Auth: verify_jwt = false (lo llama pg_cron)
// Secrets: RESEND_API_KEY, RESEND_FROM
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reminderEmail, sendEmail } from "../_shared/email.ts";

const REMIND_EVERY_DAYS = 6;

// deno-lint-ignore no-explicit-any
type Row = any;

const toCents = (n: number) => Math.round(Number(n) * 100);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: groups, error } = await admin
    .from("expense_groups")
    .select("id, name")
    .eq("is_archived", false);
  if (error) return json({ error: error.message }, 500);

  const now = Date.now();
  const cutoff = now - REMIND_EVERY_DAYS * 24 * 60 * 60 * 1000;
  let sent = 0;
  let skipped = 0;
  const results: { group: string; sent?: number; error?: string }[] = [];

  for (const g of (groups ?? []) as Row[]) {
    try {
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        admin.from("group_members").select("id, display_name, email, status, last_reminded_at").eq("group_id", g.id),
        admin.from("shared_expenses").select("id, paid_by, amount_ars").eq("group_id", g.id),
        admin.from("settlements").select("from_member, to_member, amount_ars").eq("group_id", g.id),
      ]);
      const members = (membersRes.data ?? []).filter((m: Row) => m.status !== "left") as Row[];
      const expenses = (expensesRes.data ?? []) as Row[];
      const settlements = (settlementsRes.data ?? []) as Row[];

      let splits: Row[] = [];
      if (expenses.length > 0) {
        const { data } = await admin
          .from("expense_splits")
          .select("member_id, amount_ars")
          .in("expense_id", expenses.map((e) => e.id));
        splits = (data ?? []) as Row[];
      }

      // Balance neto por miembro (en centavos). >0 acreedor, <0 deudor.
      const net = new Map<string, number>();
      for (const m of members) net.set(m.id, 0);
      const add = (id: string, c: number) => net.set(id, (net.get(id) ?? 0) + c);
      for (const e of expenses) add(e.paid_by, toCents(e.amount_ars));
      for (const s of splits) add(s.member_id, -toCents(s.amount_ars));
      for (const st of settlements) {
        add(st.from_member, toCents(st.amount_ars));
        add(st.to_member, -toCents(st.amount_ars));
      }

      // Simplificación greedy → transferencias deudor→acreedor.
      const creditors = [...net.entries()].filter(([, c]) => c > 0).map(([id, c]) => ({ id, c })).sort((a, b) => b.c - a.c);
      const debtors = [...net.entries()].filter(([, c]) => c < 0).map(([id, c]) => ({ id, c: -c })).sort((a, b) => b.c - a.c);
      const byId = new Map(members.map((m) => [m.id, m]));

      let i = 0;
      let j = 0;
      let groupSent = 0;
      while (i < debtors.length && j < creditors.length) {
        const pay = Math.min(debtors[i].c, creditors[j].c);
        const debtor = byId.get(debtors[i].id);
        const creditor = byId.get(creditors[j].id);
        // Mandamos recordatorio al deudor si tiene email y no fue avisado hace poco.
        if (pay > 0 && debtor?.email) {
          const last = debtor.last_reminded_at ? new Date(debtor.last_reminded_at).getTime() : 0;
          if (last < cutoff) {
            const tmpl = reminderEmail({
              groupName: g.name,
              debtorName: debtor.display_name,
              amount: pay / 100,
              toName: creditor?.display_name ?? "otro miembro",
            });
            const r = await sendEmail({ to: debtor.email, subject: tmpl.subject, html: tmpl.html });
            if (r.ok) {
              await admin.from("group_members").update({ last_reminded_at: new Date().toISOString() }).eq("id", debtor.id);
              groupSent++;
              sent++;
              // Marcamos en memoria para no re-avisar a este deudor en otra arista.
              debtor.last_reminded_at = new Date().toISOString();
            }
          } else {
            skipped++;
          }
        }
        debtors[i].c -= pay;
        creditors[j].c -= pay;
        if (debtors[i].c === 0) i++;
        if (creditors[j].c === 0) j++;
      }
      results.push({ group: g.name, sent: groupSent });
    } catch (e) {
      results.push({ group: g.name, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({ sent, skipped, results });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
