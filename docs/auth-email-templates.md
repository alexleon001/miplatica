# Auth — SMTP propio (Resend) + plantillas de mail

Objetivo: que los mails de **confirmación de cuenta** y **reset de contraseña** lleguen
(en español, con marca "Mi Plata") en vez de la plantilla default de Supabase (inglés,
remitente `noreply@mail.app.supabase.io`, rate limit de pocos mails/hora → no apto para prod).

El mismo Resend sirve para los mails de **gastos compartidos** (edges `group-invite`/
`group-reminder`/`split-reminders-cron`, hoy con `RESEND_API_KEY` sin setear).

---

## 1. Cuenta Resend + dominio (bloqueante para usuarios reales)

1. Crear cuenta en https://resend.com.
2. **Verificar un dominio propio** (Resend → Domains → Add). Sin dominio verificado,
   Resend **solo envía a tu propia dirección de la cuenta** → sirve para tu prueba, NO
   para usuarios reales.
   - `miplatica.vercel.app` es un subdominio de Vercel: **no** podés agregarle los DNS
     de Resend. Hace falta un dominio real (el roadmap ya baraja `miplata.app`).
   - Verificación = agregar los registros SPF/DKIM (TXT/CNAME) que da Resend al DNS del
     dominio.
3. Crear una **API key** (Resend → API Keys). Formato `re_...`.

## 2. Supabase → Custom SMTP

Dashboard → **Authentication → Emails → SMTP Settings** → Enable custom SMTP:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la API key `re_...` |
| Sender email | `hola@tudominio` (o `onboarding@resend.dev` solo para probar a tu mail) |
| Sender name | `Mi Plata` |

Después, **Authentication → Rate Limits**: subir el límite de emails/hora (con SMTP
propio ya no aplica el tope bajo del servicio integrado).

## 3. Plantillas (Authentication → Emails → Templates)

### "Confirm signup"

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#0B1120;padding:32px;color:#F3F4F6">
  <div style="max-width:440px;margin:0 auto;background:#111827;border:1px solid #1F2937;border-radius:20px;padding:36px 28px;text-align:center">
    <div style="font-size:30px;margin-bottom:12px">💰</div>
    <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Confirmá tu cuenta en Mi Plata</h1>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 24px">
      ¡Bienvenido/a! Tocá el botón para activar tu cuenta y empezar a controlar tu plata.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:linear-gradient(135deg,#6366F1,#22D3EE);color:#fff;font-weight:700;
              text-decoration:none;padding:14px 28px;border-radius:12px;font-size:16px">
      Confirmar mi cuenta
    </a>
    <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:24px 0 0">
      Si no fuiste vos, ignorá este correo. El enlace vence en unas horas.
    </p>
  </div>
</div>
```

### "Reset Password" (Recovery) — redirige a `web/restablecer.html`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#0B1120;padding:32px;color:#F3F4F6">
  <div style="max-width:440px;margin:0 auto;background:#111827;border:1px solid #1F2937;border-radius:20px;padding:36px 28px;text-align:center">
    <div style="font-size:30px;margin-bottom:12px">🔑</div>
    <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Restablecé tu contraseña</h1>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 24px">
      Pediste cambiar tu contraseña de Mi Plata. Tocá el botón para elegir una nueva.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:linear-gradient(135deg,#6366F1,#22D3EE);color:#fff;font-weight:700;
              text-decoration:none;padding:14px 28px;border-radius:12px;font-size:16px">
      Cambiar mi contraseña
    </a>
    <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:24px 0 0">
      Si no fuiste vos, ignorá este correo: tu contraseña sigue igual.
    </p>
  </div>
</div>
```

## 4. URL Configuration (Authentication → URL Configuration) — CRÍTICO

Causa de la redirección rota (`localhost:3000/#access_token=…` → ERR_CONNECTION_REFUSED
al tocar el link del mail): el **Site URL** quedó en el default `http://localhost:3000`.
Supabase valida el token del lado servidor (por eso la activación igual funciona), pero
redirige al Site URL si el `emailRedirectTo` no está en la allow-list.

- **Site URL** → `https://miplatica.vercel.app`
- **Redirect URLs** (allow-list) → agregar:
  - `https://miplatica.vercel.app/**`
  - (o específicos) `https://miplatica.vercel.app/confirmado`, `https://miplatica.vercel.app/restablecer`

---

## Diagnóstico (sesión 2026-07-22, validado en device)

Probado en device con un mail nuevo: **el mail SÍ llega** (a Recibidos, ~2 min) → el
problema era **claridad**, no entrega. Baja la urgencia del SMTP propio (Resend queda para
branding/sender/rate-limit a escala); suben la del template ES + la config de URL.

Problemas concretos vistos:
1. **Redirección rota** → Site URL en `localhost:3000` (ver sección 4). La activación
   funciona igual (token validado server-side).
2. **Mail feo/inglés** → template default de Supabase (ver sección 3).
3. **La app tomaba el nombre del email** (`Hola, alexanderleonar001`) → el trigger
   `handle_new_user` hacía `coalesce(meta->>'name', split_part(email,'@',1))`, así `name`
   nunca era null y el onboarding (que ya pide país+nombre) se salteaba. Arreglado en
   migración `0021`: `name` queda NULL si no viene en metadata → onboarding se dispara.
4. **Login/signup** rediseñado (`app/(auth)/login.tsx`): segmented Entrar/Crear cuenta,
   inputs con ícono, toggle ver contraseña, aviso persistente + botón reenviar.

Pendiente native (necesita rebuild + dep): en modo claro los botones de navegación de
Android quedan casi invisibles → instalar `expo-navigation-bar` y setear el estilo de los
botones según el tema. Va con el próximo APK.
