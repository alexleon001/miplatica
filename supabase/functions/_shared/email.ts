// ============================================
// Mi Platica — Envío de email transaccional (Resend) + plantillas
// ============================================
// Infra de envío compartida por las edges de gastos compartidos (invitaciones y
// recordatorios de saldo). Sin deps: POST directo a la API de Resend.
//
// Secrets requeridos (supabase secrets set):
//   RESEND_API_KEY  → API key de Resend (re_...)
//   RESEND_FROM     → remitente verificado (ej "Mi Platica <hola@miplatica.app>").
//                     En pruebas sirve "onboarding@resend.dev" (destinatarios
//                     limitados a la cuenta dueña).
//
// Todas las funciones fallan CERRADO devolviendo {ok:false}: si falta la key o
// Resend responde error, la edge sigue (no rompe el alta del miembro / el cron).

const RESEND_API = "https://api.resend.com/emails";
const APP_NAME = "Mi Platica";
const BRAND = "#6366F1";

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "Mi Platica <onboarding@resend.dev>";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY missing" };

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message ?? `Resend ${res.status}` };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── plantillas ────────────────────────────────────────────────────────────────

function layout(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0B1120;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#E5E7EB;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1F2937;border-radius:16px;overflow:hidden">
    <div style="background:${BRAND};padding:20px 24px"><span style="font-size:18px;font-weight:800;color:#fff">💸 ${APP_NAME}</span></div>
    <div style="padding:24px">${inner}</div>
    <div style="padding:16px 24px;border-top:1px solid #1F2937;font-size:12px;color:#6B7280">Tus finanzas, con inteligencia argentina.</div>
  </div></body></html>`;
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;margin-top:8px">${label}</a>`;
}

export function inviteEmail(args: { groupName: string; inviterName: string; link: string }): { subject: string; html: string } {
  return {
    subject: `${args.inviterName} te invitó a dividir gastos en ${APP_NAME}`,
    html: layout(`
      <h2 style="margin:0 0 8px;color:#fff;font-size:20px">Te sumaron a "${args.groupName}"</h2>
      <p style="margin:0 0 8px;line-height:1.5;color:#9CA3AF"><b style="color:#E5E7EB">${args.inviterName}</b> te invitó a llevar las cuentas compartidas del grupo en ${APP_NAME}.</p>
      <p style="margin:0 0 16px;line-height:1.5;color:#9CA3AF">Abrí el link en tu celular para ver el grupo. Si todavía no tenés la app, registrate con este mismo email y vas a quedar vinculado automáticamente.</p>
      ${button("Ver el grupo", args.link)}
    `),
  };
}

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function reminderEmail(args: { groupName: string; debtorName: string; amount: number; toName: string }): { subject: string; html: string } {
  return {
    subject: `Recordatorio: tenés un saldo pendiente en "${args.groupName}"`,
    html: layout(`
      <h2 style="margin:0 0 8px;color:#fff;font-size:20px">Hola ${args.debtorName} 👋</h2>
      <p style="margin:0 0 8px;line-height:1.5;color:#9CA3AF">Te recordamos que en el grupo <b style="color:#E5E7EB">${args.groupName}</b> tenés un saldo pendiente:</p>
      <p style="margin:8px 0 16px;font-size:24px;font-weight:800;color:#F59E0B">Debés ${arsFmt.format(args.amount)} a ${args.toName}</p>
      <p style="margin:0;line-height:1.5;color:#9CA3AF">Cuando saldes, registralo en ${APP_NAME} para que las cuentas queden al día.</p>
    `),
  };
}
