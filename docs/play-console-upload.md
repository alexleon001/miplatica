# Subir Mi Plata a Google Play — paso a paso

> La **primera** subida de una app nueva tiene que ser manual desde el Play Console: la API de
> Google Play Developer (la que usa `eas submit`) recién sirve cuando ya hay un bundle subido a
> mano. Después de esta vez, se automatiza (ver el final).

## 0. Antes de empezar

- **Descargá el AAB** (versionCode 6):
  `https://expo.dev/artifacts/eas/lX8mHm3pg5EbU24kL7o0yBMKj-lzfE1S9l8d5cQn_YQ.aab`
  Los artifacts de EAS vencen a los 30 días → bajalo ya y guardalo.
- Tené a mano `docs/store-listing.md` (textos) y `docs/play-data-safety.md` (formularios).

## 1. Crear la app

Play Console → **Crear app**:

| Campo | Valor |
|---|---|
| Nombre de la app | `Mi Plata: Finanzas con IA` (25 chars, entra en el límite de 30) |
| **Nombre del paquete** | **`com.alexleon001.miplatica`** ← exacto, ver abajo |
| Idioma predeterminado | Español (Latinoamérica) — `es-419` |
| App o juego | **App** |
| Gratuita o de pago | **Gratuita** (las subs Pro son compras dentro de la app) |

> 🔴 **El package name se pide al crear la app y es PERMANENTE.** Tiene que ser exactamente
> `com.alexleon001.miplatica` (el mismo de `app.json` y el que está firmado dentro del AAB): si no
> coincide, Play rechaza el bundle. Va con "miplatica" aunque la app se llame "Mi Plata" — los
> identificadores internos no cambiaron en el rebrand y el usuario nunca ve esta cadena. Si se
> escribe mal, la única salida es crear otra app desde cero.

Aceptá las declaraciones de políticas.

## 2. Closed testing (el reloj de 14 días arranca acá)

**Probar y lanzar → Pruebas cerradas → Crear una versión.**

1. **Firma de apps**: elegí **Play App Signing** (gestionada por Google). Nuestro AAB está firmado con
   el keystore de EAS, que queda registrado como *clave de subida*. No pierdas ese keystore: lo
   administra EAS (`eas credentials`).
2. **Subí el `.aab`**. El nombre de la versión se autocompleta como `6 (0.1.0)`.
3. **Notas de la versión**: copiá el bloque "Notas de lanzamiento sugeridas" de `docs/store-listing.md`.
4. **Testers**: creá una lista de correo con **12 direcciones como mínimo** (Probar y lanzar →
   Pruebas → Testers). Tienen que ser 12 cuentas de Google reales, aceptar la invitación y
   **permanecer inscriptas 14 días corridos**.
5. **Guardar → Revisar versión → Iniciar lanzamiento en pruebas cerradas.**

> ⚠️ El requisito de 12 testers × 14 días aplica a las **cuentas de desarrollador personales**
> creadas desde fines de 2023. Si tu cuenta es de **organización**, no aplica y podés ir directo a
> producción.

## 3. Lo que Play va a bloquear hasta completarlo

El botón de lanzamiento no se habilita hasta terminar **Contenido de la app**. Respuestas listas en
`docs/play-data-safety.md`:

- **Política de privacidad**: `https://miplatica.vercel.app/privacidad`
- **Acceso a la app**: usuario de prueba (email en `play-data-safety.md`, contraseña aparte) — la app
  exige login, sin esto rebota.
- **Anuncios**: sí, contiene anuncios.
- **Seguridad de los datos**: incluye la URL de eliminación
  `https://miplatica.vercel.app/eliminar-cuenta`.
- **Clasificación de contenido** (IARC), **Público objetivo**, **Funciones financieras**.
- **Ficha de Play Store**: textos e imágenes de `docs/store-listing.md` + los assets de
  `assets/play/` (ícono 512 y feature graphic). Los **screenshots** hay que sacarlos en el teléfono.

## 4. Después: automatizar las subidas

Cuando la app ya exista en el Console:

1. Play Console → **Configuración → Acceso a la API** → vincular un proyecto de Google Cloud y crear
   una **cuenta de servicio** con permiso de *Administrador de versiones*.
2. Descargar el JSON de la clave y guardarlo **fuera del repo** (nunca commitearlo).
3. Agregar a `eas.json`:
   ```json
   "submit": { "production": { "android": { "serviceAccountKeyPath": "../play-service-account.json", "track": "internal" } } }
   ```
4. Desde entonces: `eas build -p android --profile production --auto-submit`.

El mismo service account es el que necesita **RevenueCat** para validar las suscripciones.
