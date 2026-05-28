# MI PLATICA — Super Prompt para Claude Code
## App de finanzas personales con IA, inversiones y contexto argentino

---

## 🧠 INSTRUCCIONES DE LECTURA OBLIGATORIA

Antes de escribir UNA SOLA LÍNEA de código, ejecutá estos pasos en orden:

1. **Leer este archivo completo** de principio a fin
2. **Leer la plantilla AI starter project** del repositorio (identificá el README o INIT principal)
3. **Crear `CLAUDE.md`** en la raíz con el estado actual, stack confirmado y próxima tarea
4. **Actualizar `CLAUDE.md`** al finalizar cada sprint o tarea antes de cerrar sesión

Si no tenés contexto suficiente de la plantilla, **detente y pedile al usuario que te la muestre** antes de continuar.

---

## 🤖 ROL DE CLAUDE CODE EN ESTE PROYECTO

Este proyecto tiene una dinámica especial: **Claude Code no solo implementa, también propone.**

Al finalizar cada sprint, antes de marcar tareas como completadas, Claude Code debe:

1. **Revisar lo construido** y detectar oportunidades de mejora
2. **Proponer entre 2 y 4 features o mejoras concretas** relacionadas con lo recién implementado, con formato:
   - Nombre del feature
   - Qué problema resuelve para el usuario
   - Estimación de complejidad (baja / media / alta)
   - Sprint sugerido para implementarlo

3. **Preguntar al usuario** cuáles quiere incluir antes de continuar con el siguiente sprint

Esto se registra en una sección `## 💡 Ideas propuestas por Claude Code` dentro de `CLAUDE.md`.

---

## 🎯 VISIÓN DEL PRODUCTO

**Nombre:** Mi Platica
**Tagline:** "Tus finanzas, con inteligencia argentina"
**Tipo:** App móvil de finanzas personales con IA
**Foco geográfico:** Argentina (pesos, dólares, inflación, instrumentos locales)
**Usuario inicial:** Uso personal (Alexander) — potencial pivote a SaaS
**Plataforma:** React Native + Expo
**Stack:** Supabase + Claude API (Sonnet 4.6) + Expo Router

---

## 🌍 CONTEXTO ARGENTINO — CRÍTICO

La app debe estar diseñada desde el día 1 para la realidad financiera argentina. Esto implica:

- **Soporte dual de monedas:** Pesos (ARS) y Dólares (USD) en paralelo, siempre
- **Tipos de cambio múltiples:** Oficial, MEP/Bolsa, Blue, CCL — el usuario elige cuál usar para calcular su patrimonio en USD
- **Inflación:** Las métricas deben poder mostrarse en términos reales (ajustadas por inflación) además de nominales
- **Instrumentos financieros locales:** FCI, CEDEARs, plazos fijos, Letras del Tesoro (LECAPs), dólar MEP, Obligaciones Negociables (ONs), acciones en BYMA
- **Cuentas remuneradas:** Mercado Pago, Ualá, Personal Pay, Naranja X, Prex — con rendimientos diarios que deben calcularse correctamente

---

## 🔌 INTEGRACIONES — ANÁLISIS DE VIABILIDAD

### ✅ Integraciones viables (implementar)

**1. Mercado Pago — API oficial**
- Endpoint: `https://api.mercadopago.com`
- Permite: consultar saldo, movimientos, historial de transacciones (OAuth del usuario)
- Documentación: `https://www.mercadopago.com.ar/developers/es/reference`
- Implementar en Sprint 4

**2. Tipos de cambio en tiempo real**
- API gratuita: `https://dolarapi.com` (dolar blue, MEP, CCL, oficial, tarjeta)
- Actualizar cada 30 minutos via Supabase Edge Function
- Sin autenticación requerida

**3. Cotizaciones de CEDEARs y acciones BYMA**
- API pública de BYMA: `https://open.bymadata.com.ar`
- O scraping liviano de cotizaciones vía edge function (como fallback)
- Para FCI: API pública de CAFCI (Cámara Argentina de Fondos Comunes de Inversión)

**4. Open Banking BCRA (Fase 1 — ya activa)**
- El BCRA reguló la consulta de saldos y movimientos via API
- Participan 15 bancos + 30 fintechs (2025-2026)
- Implementar via Plunzo o aggregador similar si se abre para developers en Sprint 5

### ⚠️ Integraciones con limitaciones (entrada manual + sync)

**Cocos Capital, Portfolio Personal, Invertironline**
- No tienen API pública para terceros
- Estrategia: importación por CSV (estos brokers permiten exportar historial)
- El usuario sube el CSV y la app lo parsea e importa automáticamente
- Claude Code debe construir un parser inteligente para cada formato

**Ualá, Personal Pay, Naranja X**
- No tienen API pública de lectura de cuenta
- Estrategia: entrada manual + recordatorios periódicos para actualizar
- Futuro: Open Banking BCRA Fase 2 (2026) podría habilitar esto

### ❌ No implementar (complejidad excesiva para V1)
- Scraping de homebanking (legal y técnicamente riesgoso)
- Crypto exchanges (Lemon, Ripio) — por ahora entrada manual

---

## 🗃️ MODELO DE DATOS (Supabase)

```sql
-- Perfil y configuración
profiles (
  id uuid references auth.users,
  name text,
  monthly_income_ars numeric,
  monthly_income_usd numeric,
  preferred_usd_type text, -- 'mep' | 'blue' | 'oficial' | 'ccl'
  inflation_adjustment boolean default true,
  currency_display text default 'both', -- 'ars' | 'usd' | 'both'
  created_at timestamp
)

-- Cuentas financieras del usuario
accounts (
  id uuid,
  user_id uuid references profiles,
  name text,                    -- "Mercado Pago", "Galicia", "Cocos Capital"
  type text,                    -- 'wallet' | 'bank' | 'broker' | 'cash' | 'crypto'
  currency text,                -- 'ARS' | 'USD' | 'USDT'
  balance_amount numeric,
  balance_updated_at timestamp,
  integration_type text,        -- 'api' | 'csv' | 'manual'
  integration_status text,      -- 'connected' | 'pending' | 'error' | 'manual'
  color text,                   -- para UI
  icon text,
  is_active boolean default true
)

-- Transacciones (gastos, ingresos, transferencias)
transactions (
  id uuid,
  user_id uuid references profiles,
  account_id uuid references accounts,
  type text,                    -- 'income' | 'expense' | 'transfer' | 'investment'
  category text,                -- 'food' | 'transport' | 'entertainment' | 'salary' etc.
  subcategory text,
  amount_ars numeric,
  amount_usd numeric,           -- calculado al momento del registro
  usd_rate_used numeric,        -- tipo de cambio usado
  description text,
  merchant text,
  date date,
  source text,                  -- 'manual' | 'mercadopago_api' | 'csv_import'
  external_id text,             -- ID en el sistema externo (para deduplicación)
  tags text[],
  notes text,
  created_at timestamp
)

-- Inversiones
investments (
  id uuid,
  user_id uuid references profiles,
  account_id uuid references accounts,
  type text,            -- 'fci' | 'cedear' | 'accion' | 'plazo_fijo' | 'on' | 'bono' | 'lecap' | 'dolar_mep' | 'usd_cash'
  ticker text,          -- 'GGAL', 'AAPL' (via CEDEAR), 'AL30', etc.
  name text,            -- nombre completo
  quantity numeric,
  avg_cost_ars numeric,
  avg_cost_usd numeric,
  current_price_ars numeric,
  current_price_usd numeric,
  current_value_ars numeric,
  current_value_usd numeric,
  profit_loss_ars numeric,
  profit_loss_usd numeric,
  profit_loss_pct numeric,
  currency text,
  purchase_date date,
  maturity_date date,           -- para plazos fijos y bonos
  interest_rate numeric,        -- TNA para plazos fijos
  last_updated timestamp
)

-- Deudas
debts (
  id uuid,
  user_id uuid references profiles,
  name text,            -- "Tarjeta Visa Galicia", "Préstamo Bancario"
  type text,            -- 'credit_card' | 'loan' | 'informal' | 'cuotas'
  total_amount numeric,
  remaining_amount numeric,
  currency text,
  interest_rate numeric,        -- TNA
  monthly_payment numeric,
  next_payment_date date,
  end_date date,
  notes text,
  is_active boolean default true
)

-- Ahorros y objetivos
savings_goals (
  id uuid,
  user_id uuid references profiles,
  name text,            -- "Viaje a Europa", "Fondo de emergencia"
  target_amount numeric,
  target_currency text,
  current_amount numeric,
  target_date date,
  monthly_contribution numeric,
  notes text
)

-- Cotizaciones históricas (cacheadas)
exchange_rates (
  id uuid,
  date date,
  oficial numeric,
  blue numeric,
  mep numeric,
  ccl numeric,
  tarjeta numeric,
  fetched_at timestamp
)

-- Precios de instrumentos financieros
asset_prices (
  id uuid,
  ticker text,
  name text,
  price_ars numeric,
  price_usd numeric,
  variation_pct numeric,
  fetched_at timestamp
)

-- Presupuestos mensuales
budgets (
  id uuid,
  user_id uuid references profiles,
  month int,
  year int,
  category text,
  limit_ars numeric,
  spent_ars numeric
)
```

---

## 📱 PANTALLAS Y NAVEGACIÓN

```
app/
├── (auth)/
│   ├── login.tsx
│   └── onboarding.tsx       -- monedas, ingresos, cuentas iniciales
├── (tabs)/
│   ├── index.tsx             -- Dashboard patrimonial
│   ├── transactions.tsx      -- Movimientos y gastos
│   ├── investments.tsx       -- Portafolio de inversiones
│   ├── debts.tsx             -- Deudas y obligaciones
│   └── more.tsx              -- Presupuestos, metas, configuración
├── modals/
│   ├── add-transaction.tsx
│   ├── add-investment.tsx
│   ├── add-debt.tsx
│   └── add-account.tsx
└── screens/
    ├── account-detail/[id].tsx
    ├── investment-detail/[id].tsx
    ├── csv-import.tsx
    └── ai-advisor.tsx        -- Chat con IA financiera
```

---

## 🚀 SPRINTS DE DESARROLLO

### SPRINT 0 — Setup y estructura
**Objetivo:** Proyecto corriendo en Expo Go con navegación y Supabase conectado

Tareas:
1. Leer la plantilla AI starter project
2. Adaptar estructura de carpetas a FinsightAR
3. Configurar Expo Router con las 5 tabs
4. Ejecutar migraciones SQL del modelo de datos en Supabase
5. Auth con Supabase (email + contraseña)
6. Variables de entorno: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
7. Crear `CLAUDE.md` con estado inicial
8. Supabase Edge Function: `fetch-exchange-rates` (consume dolarapi.com cada 30 min)

**Al finalizar:** proponer mejoras al setup según la plantilla leída.

---

### SPRINT 1 — Dashboard Patrimonial
**Objetivo:** Vista de riqueza neta total con multi-moneda

Layout del Dashboard:
```
[Saludo + fecha]

[Card grande: Patrimonio Total]
  ARS: $4.250.000      USD: ~$3.820
  [Toggle: ver en ARS / USD / ambos]
  [Selector tipo de cambio: Oficial / MEP / Blue]

[Fila de tarjetas: Activos / Deudas / Neto]

[Sección: Mis cuentas]
  [Mercado Pago]  $180.000 ARS  +$320 hoy
  [Cocos Capital] $1.200.000 ARS  (manual)
  [Efectivo USD]  $500 USD
  [+ Agregar cuenta]

[Sección: Variación del patrimonio]
  Gráfico de línea — últimos 30 días

[Tipo de cambio actual]
  Oficial: $1.020  |  MEP: $1.185  |  Blue: $1.240
  Actualizado hace 12 min
```

Cálculos clave:
- Patrimonio bruto = suma de saldos de todas las cuentas activas
- Deudas = suma de `remaining_amount` de todas las deudas activas
- Patrimonio neto = Patrimonio bruto - Deudas
- Conversión USD: usar `preferred_usd_type` del perfil o lo que seleccione en el toggle

---

### SPRINT 2 — Transacciones e IA categorizadora
**Objetivo:** Registrar gastos e ingresos con categorización automática por IA

#### 2.1 Pantalla de Transacciones
- Lista cronológica con agrupación por día
- Chips de filtro: Todos / Gastos / Ingresos / por categoría
- Resumen del mes: Total gastado / Total ingresado / Balance
- Búsqueda por descripción o comercio

#### 2.2 Modal: Nueva Transacción
Campos:
- Tipo: Gasto / Ingreso / Transferencia
- Monto (con selector ARS / USD)
- Descripción
- Fecha
- Cuenta
- Categoría (con sugerencia por IA)
- Foto de comprobante (opcional) — trigger para categorización por Claude Vision

#### 2.3 Categorización automática por IA (Supabase Edge Function)
Prompt base para Claude Sonnet 4.6:

```typescript
const CATEGORIZE_PROMPT = `Sos un asistente financiero argentino.
Dado este gasto, categorizalo y respondé SOLO en JSON:

{
  "category": "food" | "transport" | "entertainment" | "utilities" | "health" |
               "education" | "clothing" | "tech" | "travel" | "supermarket" |
               "restaurants" | "transfers" | "salary" | "investment" | "other",
  "subcategory": "descripción corta",
  "merchant_normalized": "nombre del comercio normalizado",
  "confidence": "high" | "medium" | "low",
  "is_recurrent": true | false,
  "notes": "observación útil si la hay, sino null"
}

Descripción del gasto: "${description}"
Monto: ${amount} ${currency}
Cuenta: ${accountName}`;
```

#### 2.4 Presupuestos por categoría
- Configurar límite mensual por categoría
- Alerta cuando se supera el 80% del límite
- Visualización: barra de progreso por categoría

---

### SPRINT 3 — Portafolio de Inversiones
**Objetivo:** Vista completa de todas las inversiones con cotizaciones en tiempo real

#### 3.1 Pantalla de Inversiones
Layout:
```
[Resumen del portafolio]
  Valor total: $2.100.000 ARS  (~$1.770 USD MEP)
  Ganancia/Pérdida total: +$184.000 (+9.6%) 🟢

[Distribución por tipo — gráfico de torta]
  FCI: 45%  |  CEDEARs: 30%  |  Plazo Fijo: 15%  |  Otros: 10%

[Lista de posiciones]
  [GGAL] Grupo Galicia         $82.50   +2.3% hoy   $245.000 total
  [FCI Balanz] Renta Fija      --       +TNA 68%    $450.000 total
  [PF Galicia] vence 15/06    TNA 35%               $315.000 total
```

#### 3.2 Cotizaciones en tiempo real
Supabase Edge Function `update-prices` (cron cada 15 min en horario bursátil):
- CEDEARs y acciones: BYMA open API o scraping liviano
- FCI: CAFCI API pública (`https://api.cafci.org.ar`)
- Dólar MEP: dolarapi.com

#### 3.3 Modal: Nueva Inversión
Tipos soportados con campos específicos:
- **FCI:** nombre del fondo, monto invertido, cuotapartes
- **CEDEAR/Acción:** ticker, cantidad de acciones, precio promedio de compra
- **Plazo Fijo:** banco, monto, TNA, fecha inicio, fecha vencimiento
- **Dólar MEP / USD Cash:** monto en USD, tipo de cambio al que compró
- **Bono/ON:** ticker, valor nominal, precio de compra, fecha vencimiento
- **LECAPs:** ticker, monto, tasa

#### 3.4 Detalle de posición
- Evolución del precio (gráfico 1D / 1S / 1M / 3M)
- Historial de compras/ventas
- Análisis IA: "¿Cómo está rindiendo esta inversión frente a la inflación?"

---

### SPRINT 4 — Integración Mercado Pago
**Objetivo:** Sincronización automática de movimientos de MP

#### 4.1 OAuth con Mercado Pago
- Flujo OAuth 2.0 para obtener access token del usuario
- Guardar token encriptado en Supabase (nunca en cliente)
- Supabase Edge Function `sync-mercadopago` que obtiene:
  - Saldo actual
  - Movimientos de los últimos 90 días
  - Rendimiento de la cuenta remunerada

#### 4.2 Importación de CSV de brokers
Parser inteligente para formatos de:
- **Cocos Capital:** formato CSV con columnas específicas
- **Portfolio Personal / Invertironline:** detectar formato automáticamente
- Claude Sonnet procesa el CSV y mapea columnas al schema de la app

Flujo:
1. Usuario sube CSV desde la pantalla de cuenta del broker
2. Edge Function lo parsea con Claude y muestra preview
3. Usuario confirma → se importan las transacciones
4. Deduplicación por `external_id` para evitar duplicados en re-imports

---

### SPRINT 5 — Asesor Financiero IA
**Objetivo:** Chat con IA que conoce las finanzas completas del usuario

#### 5.1 Pantalla AI Advisor (`ai-advisor.tsx`)
- Interfaz de chat conversacional
- Claude Sonnet 4.6 con contexto completo del perfil financiero
- Cada mensaje incluye en el sistema: snapshot del patrimonio, inversiones, deudas y gastos del último mes

**System prompt base:**

```typescript
const buildFinancialContext = (profile, accounts, investments, debts, monthlyStats) => `
Sos un asesor financiero personal especializado en el mercado argentino.
Tu usuario se llama ${profile.name}.

=== CONTEXTO FINANCIERO ACTUAL ===
Patrimonio neto: ${monthlyStats.netWorth_ars} ARS / ${monthlyStats.netWorth_usd} USD (MEP)
Ingresos mensuales: ${profile.monthly_income_ars} ARS

Cuentas activas: ${accounts.map(a => `${a.name}: ${a.balance_amount} ${a.currency}`).join(', ')}

Inversiones: ${investments.map(i => `${i.name}: ${i.current_value_ars} ARS (${i.profit_loss_pct > 0 ? '+' : ''}${i.profit_loss_pct}%)`).join(', ')}

Deudas: ${debts.map(d => `${d.name}: ${d.remaining_amount} ${d.currency}`).join(', ')}

Gastos este mes: ${monthlyStats.totalExpenses_ars} ARS
Balance del mes: ${monthlyStats.monthlyBalance_ars} ARS

=== TU ROL ===
- Respondé siempre en español argentino (vos, etc.)
- Considerá la inflación y el contexto macroeconómico argentino
- Sé concreto y accionable, no genérico
- Cuando des consejos de inversión, aclará que son sugerencias y no asesoramiento profesional
- Usá los datos reales del usuario para personalizar cada respuesta
`;
```

Preguntas sugeridas de inicio:
- "¿Cómo están mis finanzas este mes?"
- "¿En qué estoy gastando más?"
- "¿Cómo le está yendo a mi portafolio vs la inflación?"
- "¿Cuándo puedo alcanzar mi objetivo de ahorro?"
- "¿Me conviene hacer un plazo fijo o quedarme en FCI?"

---

### SPRINT 6 — Deudas, Metas y Presupuestos
**Objetivo:** Control completo de obligaciones y objetivos financieros

#### 6.1 Pantalla de Deudas
- Lista de deudas con saldo pendiente
- Próximos vencimientos (alertas 3 días antes)
- Calculadora: "¿Cuánto pago de más por intereses?"
- Estrategias IA: bola de nieve vs avalancha para cancelar deudas

#### 6.2 Metas de Ahorro
- Crear objetivo: nombre, monto objetivo, moneda, fecha, contribución mensual
- Progreso visual
- Proyección: "A este ritmo, lo alcanzás en X meses"
- IA: "¿Qué deberías ajustar para llegar antes?"

#### 6.3 Presupuestos
- Configurar límite por categoría para el mes en curso
- Dashboard de presupuestos: gastado vs límite
- Alertas push cuando se acerca al límite (80%)
- Historial de presupuestos mes a mes

---

## 🎨 GUÍA DE DISEÑO

### Paleta de colores
```
Primary: #6366F1      (índigo — confianza financiera)
Positive: #22C55E     (verde — ganancias)
Negative: #EF4444     (rojo — pérdidas / deudas)
Warning: #F59E0B      (amarillo — alertas)
ARS color: #74B9FF    (celeste — identificar ARS)
USD color: #55EFC4    (verde menta — identificar USD)
Background dark: #0F172A
Surface dark: #1E293B
Text primary: #F8FAFC
```

### Principios de UI para contexto argentino
- **Siempre mostrar ambas monedas** cuando el dato lo permite
- **Tipo de cambio visible** en todo momento en el footer o header
- **Variación porcentual** siempre en contexto inflacionario (nominal ≠ real)
- **Colores de estado:** verde = ganancia o en target, rojo = pérdida o sobre límite

### Componentes clave
1. `CurrencyToggle` — switch ARS / USD / Ambas
2. `NetWorthCard` — card grande de patrimonio neto
3. `InvestmentRow` — fila de posición con PnL coloreado
4. `ExchangeRateBar` — barra con cotizaciones del día
5. `DebtProgressBar` — barra de deuda con días al vencimiento
6. `AIAdvisorChat` — interfaz de chat con Claude

---

## ⚠️ REGLAS CRÍTICAS PARA CLAUDE CODE

1. **Nunca mostrar solo ARS** — toda pantalla con montos debe ofrecer la vista en USD
2. **API keys siempre en Edge Functions** — nunca en el cliente (Mercado Pago, Claude API)
3. **Tokens de MP encriptados** — usar `pgcrypto` en Supabase para almacenar el access token
4. **Deduplicación obligatoria** en importaciones (por `external_id`)
5. **Manejo de inflación** — cuando se muestren rendimientos históricos, siempre calcular si le ganó o no a la inflación
6. **Siempre TypeScript** — sin `.js`
7. **Actualizar `CLAUDE.md`** al final de cada sprint
8. **Proponer mejoras** al finalizar cada sprint (rol proactivo obligatorio)
9. **Confirmar migraciones SQL** antes de ejecutarlas en Supabase

---

## 📄 FORMATO DE CLAUDE.md

```markdown
# FinsightAR — Estado del Proyecto

## Stack confirmado
- Expo SDK: [versión de la plantilla]
- Supabase Client: [versión]
- Modelo IA: claude-sonnet-4-6

## Sprint actual
Sprint [N] — [Nombre]

## Última tarea completada
[descripción]

## Próxima tarea
[descripción]

## Variables de entorno requeridas
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- ANTHROPIC_API_KEY (solo Edge Functions)
- MP_CLIENT_ID (solo Edge Functions)
- MP_CLIENT_SECRET (solo Edge Functions)

## Decisiones técnicas tomadas
- [decisión: razón]

## 💡 Ideas propuestas por Claude Code
### Sprint [N]
- [Idea]: [problema que resuelve] | Complejidad: [baja/media/alta] | Sprint sugerido: [N]

## Integraciones activas
- [ ] Mercado Pago OAuth
- [ ] Tipos de cambio (dolarapi.com)
- [ ] Cotizaciones BYMA
- [ ] FCI (CAFCI API)
- [ ] CSV Cocos Capital
- [ ] CSV Portfolio Personal

## Deuda técnica
- [item]
```

---

## 🏁 PRIMER COMANDO

Cuando estés listo para empezar, ejecutá esto en Claude Code:

```
Lee este archivo (FINANZAS_SUPER_PROMPT.md) completo, luego lee la plantilla
AI starter project del repositorio actual. Una vez que hayas procesado ambos,
creá el archivo CLAUDE.md con el estado inicial del proyecto, proponé
cualquier ajuste de arquitectura que veas necesario, y comenzá el Sprint 0.
Confirmá cada paso antes de ejecutar migraciones en Supabase.
Recordá tu rol: al finalizar cada sprint, proponer mejoras y features nuevos.
```

---

*Generado el 28 de mayo de 2026 | FinsightAR v0.1 — Finanzas Personales con IA para Argentina*
