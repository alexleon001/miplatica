# Mi Platica — Estado del Proyecto

> App móvil de finanzas personales con IA, foco Argentina (ARS/USD, inflación, MEP/Blue/CCL, FCI, CEDEARs, plazos fijos).
> Tagline: *"Tus finanzas, con inteligencia argentina"*

---

## Stack confirmado

| Capa | Tecnología | Versión / Notas |
|---|---|---|
| App móvil | React Native + Expo + Expo Router | SDK por instalar en Sprint 0 |
| Lenguaje | TypeScript | 5.8+ (strict) |
| Runtime / Package manager | Bun | 1.x (heredado del boilerplate KATA) |
| Backend | Supabase (Postgres 17 + Auth + Edge Functions + Storage) | proyecto `mi-platica` a crear en `sa-east-1` |
| IA | Claude Sonnet 4.6 vía Edge Functions | `claude-sonnet-4-6` |
| Tests E2E (futuro) | Playwright + KATA | heredado del boilerplate, sin tocar |
| Cotizaciones | dolarapi.com (gratis), CAFCI, BYMA | sin auth |

**Repo:** `https://github.com/alexleon001/miplatica.git`

---

## Sprint actual

**Sprint 0 — Setup y estructura**

Objetivo: proyecto corriendo en Expo Go con navegación a 5 tabs, Supabase conectado, auth funcional y primera Edge Function desplegada.

---

## Última tarea completada

- [x] Lectura completa de `FINANZAS_SUPER_PROMPT.md`
- [x] Análisis de la plantilla actual (`kata-playwright-boilerplate` de UPEX Galaxy) — decisión: **convive**, se reutiliza lo que sirve (TS, `.context/`, `.prompts/`, `.claude/`, MCPs); Playwright queda en `tests/` para futuros E2E.
- [x] `autoskills` instalado (`bun`, `playwright-best-practices`, `typescript-advanced-types`).
- [x] `CLAUDE.md` del boilerplate archivado como `CLAUDE.boilerplate.md`.
- [x] Organización Supabase identificada: `alexleon001` (`lfzwokjsazkhznvyvzbk`).

## Próxima tarea

1. **Desbloquear Supabase**: usuario debe borrar `EchoShift` (tope free tier 2/org). Luego crear `mi-platica` en `sa-east-1`.
2. Aplicar migraciones SQL (preparadas en `supabase/migrations/0001_init.sql`, **pendiente de OK del usuario antes de `apply_migration`**).
3. Configurar `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` reales en `.env`.
4. Inicializar Expo Router + scaffolding de `app/(auth)`, `app/(tabs)`, `app/modals/`.
5. Desplegar Edge Function `fetch-exchange-rates`.

---

## Variables de entorno requeridas

| Variable | Dónde | Sprint en que se introduce |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | cliente (app) | Sprint 0 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | cliente (app) | Sprint 0 |
| `ANTHROPIC_API_KEY` | **solo Edge Functions** (`supabase secrets set`) | Sprint 2 |
| `MP_CLIENT_ID` | **solo Edge Functions** | Sprint 4 |
| `MP_CLIENT_SECRET` | **solo Edge Functions** | Sprint 4 |

> Regla #2 del super prompt: API keys **JAMÁS** en el cliente. Todo lo sensible vive en Edge Functions / Supabase secrets.

---

## Decisiones técnicas tomadas

| # | Decisión | Razón |
|---|---|---|
| 1 | Convivir Expo + Playwright en el mismo repo | Usuario pidió misma carpeta y reutilizar lo que sirva. Playwright se mantiene para E2E web futuro (panel admin, edge functions). |
| 2 | Región Supabase = `sa-east-1` (São Paulo) | Latencia óptima para usuarios AR. |
| 3 | Usar **publishable keys** (`sb_publishable_...`), no legacy anon JWT | Mejor seguridad y rotación independiente (recomendación oficial Supabase). |
| 4 | Edge Functions con `verify_jwt: true` por defecto | Toda función requiere usuario auth, salvo cron/webhooks explícitamente públicos. |
| 5 | Naming del proyecto: `mi-platica` (kebab-case) | Convención Supabase. |
| 6 | `claude-sonnet-4-6` para IA | Per super prompt; balance costo/calidad para categorización + asesor. |
| 7 | Tipos de cambio: `dolarapi.com`, sin auth, cron 30 min | Suficiente para v1; sin scraping. |

---

## 💡 Ideas propuestas por Claude Code

### Sprint 0
*(pendiente — se completa al cierre del sprint, antes de pasar a Sprint 1)*

---

## Integraciones activas

- [ ] Supabase Auth (email + password)
- [ ] dolarapi.com (Edge Function `fetch-exchange-rates`)
- [ ] Mercado Pago OAuth — Sprint 4
- [ ] BYMA / CAFCI — Sprint 3
- [ ] CSV Cocos Capital — Sprint 4
- [ ] CSV Portfolio Personal — Sprint 4
- [ ] Open Banking BCRA — eval Sprint 5+

---

## Deuda técnica

- `CLAUDE.boilerplate.md` queda como referencia; cuando el equipo defina si Playwright/KATA se usará para algún panel web futuro, decidir si extraer o eliminar.
- `package.json` aún declara nombre `kata-playwright-boilerplate`. Pendiente renombrar a `mi-platica` (se hace en el commit de Sprint 0).
- `.gitignore` necesita bloques para artefactos Expo (`.expo/`, `dist/`, `web-build/`) — se agrega en Sprint 0.

---

## Reglas críticas operativas (resumen)

1. **Nunca mostrar solo ARS** — toda pantalla con montos ofrece vista USD.
2. **API keys solo en Edge Functions**, jamás en cliente.
3. **Tokens MP encriptados** con `pgcrypto`.
4. **Deduplicación obligatoria** por `external_id` en importaciones CSV.
5. **Inflación**: rendimientos históricos siempre comparados contra IPC.
6. **TypeScript siempre** — sin `.js`.
7. **Confirmar migraciones SQL** antes de `apply_migration` a Supabase.
8. **Idioma:** español argentino (vos) para el usuario; código y commits en inglés.
9. **No push a `main` sin OK explícito.**
10. **Sin AI attribution** en commits.
11. **Rol proactivo:** al cierre de cada sprint, proponer 2–4 mejoras y registrarlas arriba.

---

## Workflow de sprints

| Sprint | Foco | Estado |
|---|---|---|
| 0 | Setup, navegación, Supabase, auth, edge function rates | 🚧 en curso |
| 1 | Dashboard patrimonial multi-moneda | ⏳ |
| 2 | Transacciones + categorización IA + presupuestos | ⏳ |
| 3 | Portafolio de inversiones con cotizaciones live | ⏳ |
| 4 | Integración Mercado Pago + import CSV brokers | ⏳ |
| 5 | Asesor financiero IA (chat con contexto completo) | ⏳ |
| 6 | Deudas, metas y presupuestos avanzados | ⏳ |

---

*Actualizar al cierre de cada sprint o tarea relevante. Última actualización: 2026-05-28.*
