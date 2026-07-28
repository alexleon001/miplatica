# Mi Plata — Formulario Data Safety de Play Console (pre-redactado)

> Respuestas listas para el cuestionario **App content → Data safety** de Play Console.
> Basado en lo que la app efectivamente recolecta (Supabase + Anthropic + RevenueCat + AdMob + Resend).
> Regla general que aplicamos: declarar de más nunca rechaza; declarar de menos sí.

## Overview

| Pregunta | Respuesta |
|---|---|
| ¿Tu app recopila o comparte datos de usuario? | **Sí** |
| ¿Los datos se cifran en tránsito? | **Sí** (HTTPS/TLS en todo) |
| ¿Los usuarios pueden solicitar la eliminación de sus datos? | **Sí** — URL a declarar: `https://miplatica.vercel.app/eliminar-cuenta` |

> **Data deletion (obligatorio desde 2023).** Play pide las dos vías y las dos existen:
> - **In-app:** Más → Sesión → **Eliminar cuenta** (pantalla `app/delete-account.tsx` → edge `delete-account`, borrado inmediato y permanente).
> - **Web, sin instalar la app:** `https://miplatica.vercel.app/eliminar-cuenta` (pasos + pedido por email + qué se borra y qué se conserva 30 días).
> En el formulario, cuando pregunte si además de borrar la cuenta se borran los datos, la respuesta es **sí, todos** (cascada sobre `auth.users`).

## Tipos de datos a declarar

### Información personal
| Dato | ¿Recolectado? | ¿Compartido? | Propósito | Obligatorio/Opcional |
|---|---|---|---|---|
| Email | Sí | No | Funcionalidad de la app (cuenta) | Obligatorio |
| Nombre | Sí | No | Funcionalidad de la app (perfil) | Opcional |

### Información financiera
| Dato | ¿Recolectado? | ¿Compartido? | Propósito |
|---|---|---|---|
| Historial de compras del usuario (subs Pro) | Sí | Sí (RevenueCat/Google Play como procesadores) | Funcionalidad de la app |
| Otra info financiera (movimientos, cuentas, inversiones, deudas que el usuario carga) | Sí | Sí* | Funcionalidad de la app |

> *"Compartido": un resumen se envía a Anthropic SOLO cuando el usuario usa una función de IA, como service provider (no para publicidad ni entrenamiento). En el formulario esto califica como transferencia a service provider — Play permite marcar "data shared" con propósito "App functionality".

### IDs del dispositivo
| Dato | ¿Recolectado? | ¿Compartido? | Propósito |
|---|---|---|---|
| Device ID / Advertising ID | Sí (solo usuarios Free, vía AdMob) | Sí (Google AdMob) | Publicidad |

### Actividad en la app
| Dato | ¿Recolectado? | ¿Compartido? | Propósito |
|---|---|---|---|
| Interacciones (contador diario de llamadas de IA) | Sí | No | Funcionalidad (límite de uso) |

### NO se recolecta (marcar "No" en el resto)
Ubicación, contactos, fotos/videos, audio, archivos, calendario, SMS/llamadas, salud, historial web, apps instaladas.

## Notas para el cuestionario

- **Cifrado en tránsito:** Sí para todo.
- **Eliminación:** la privacy (https://miplatica.vercel.app/privacidad) documenta el proceso (30 días).
- **Cuenta requerida:** Sí (email + contraseña, Supabase Auth).
- **Advertising ID:** declarar el permiso `com.google.android.gms.permission.AD_ID` (lo agrega react-native-google-mobile-ads automáticamente).
- **Familias / niños:** app 13+, NO dirigida a niños → en "Target audience" elegir 18+ (o 13+ y completar lo extra); NO al programa Families.

## App access (credenciales para el revisor)

La app exige login, así que hay que completar **App content → App access → "All functionality
requires special access"** o el revisor rechaza por "no pudimos ver la app".

- Usuario AR de revisión: **`miplata.review.ar@gmail.com`** (Pro activado a mano + datos
  sembrados: cuentas, movimientos de julio, inversiones, deudas, metas y presupuestos).
  **La contraseña NO va en el repo** (público) — está en la memoria del proyecto
  (`project_play_reviewer_account`).
- Instrucciones a pegar en el formulario: *"Iniciar sesión con el usuario de prueba. La cuenta
  ya tiene datos cargados y la suscripción Pro activa para poder ver las funciones de IA."*
- Para el listing de Venezuela existe un segundo usuario (ver `project_ve_test_user`).

> Ojo operativo: el proyecto Supabase Free **se auto-pausa** sin tráfico. Si se pausa durante la
> review, el revisor ve la app rota → rechazo. Pasar a Pro antes de mandar a revisión.

## Otros formularios de App content (respuestas rápidas)

- **Privacy policy URL:** `https://miplatica.vercel.app/privacidad`
- **Ads:** Sí, la app contiene anuncios (AdMob, solo Free).
- **Content rating (IARC):** categoría "Utility/Productivity"; sin violencia/apuestas/contenido sexual → sale rating "Everyone"/PEGI 3. Ojo: hay pregunta sobre "gambling" → No; "compras digitales" → Sí (subs).
- **Financial features declaration:** la app es un **tracker de finanzas personales**; NO ofrece préstamos, ni banca, ni transferencias, ni trading, ni cripto exchange → declarar "My app doesn't provide any financial features" o la opción de personal finance management según el desplegable vigente.
- **Government apps:** No. **News:** No. **COVID:** No.
- **Data safety → app-ads.txt:** ya publicado en `https://miplatica.vercel.app/app-ads.txt` (pub-9459018521108034); verificar en AdMob → Apps → app-ads.txt una vez que la ficha esté publicada y el "developer website" apunte a miplatica.vercel.app.
