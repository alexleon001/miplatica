# Mi Plata — Ficha de Google Play (ASO)

> Textos listos para pegar en Play Console. Idioma base: `es-419` (español latinoamericano).
> Play permite **custom store listings por país**: usar la variante AR para Argentina y la VE para Venezuela (Grow → Store presence → Custom store listings).
> Límites: título ≤ 30 chars · descripción corta ≤ 80 chars · descripción larga ≤ 4000 chars.

---

## Título (30 chars máx)

| Variante | Texto | Chars |
|---|---|---|
| Base / AR / VE | `Mi Plata: Finanzas con IA` | 25 |

## Descripción corta (80 chars máx)

| Variante | Texto | Chars |
|---|---|---|
| Base | `Gastos, dólares e inversiones con IA. Tu plata, con inteligencia.` | 66 |
| AR | `Gastos, dólar MEP/blue, inversiones e inflación real. Tu plata, con IA.` | 72 |
| VE | `Gastos en Bs y USD, tasa BCV y paralelo, ahorros y cripto. Con IA.` | 66 |

## Descripción larga — variante Argentina

```
Mi Plata es la app de finanzas personales con inteligencia artificial hecha para la economía argentina: pesos que se devalúan, cinco dólares distintos e inflación que se come tus ahorros. Acá todo eso está integrado, no es un problema tuyo.

💸 CONTROL DE GASTOS SIN FRICCIÓN
• Cargá movimientos en segundos; la IA les pone la categoría sola.
• Desglose del mes por categoría y comparación contra el mes anterior.
• Presupuestos vivos con alertas al 80% y al 100%.
• Importá el CSV de tu banco o broker (Cocos, PPI, IOL y más).
• Sincronizá tus pagos de Mercado Pago automáticamente.

💵 MULTI-MONEDA DE VERDAD
• Todo se ve en pesos Y en dólares, siempre.
• Elegí tu dólar: oficial, MEP, blue, CCL o tarjeta, actualizados todo el día.
• Patrimonio neto consolidado: cuentas, inversiones y deudas.

📈 INVERSIONES CONTRA LA INFLACIÓN
• Plazos fijos, FCI, CEDEARs, acciones, bonos, ON, LECAP y cripto con precios en vivo.
• Rendimiento REAL: comparamos cada posición contra el IPC del INDEC desde que la compraste. Ganarle al plazo fijo no alcanza; hay que ganarle a la inflación.

🤖 ASESOR FINANCIERO CON IA (PRO)
• Chateá con un asesor que ve tus números reales y habla en argentino.
• Resumen mensual inteligente: en qué gastaste de más, cómo venís contra la inflación y un consejo concreto para el mes que viene.

📅 PROYECCIÓN DE PAGOS
• Cuotas, vencimientos, sueldos y gastos fijos proyectados mes a mes.
• Te avisamos con anticipación si te vas a quedar sin efectivo.

👥 GASTOS COMPARTIDOS
• Viajes, convivencia o salidas: cargá los gastos del grupo y calculamos quién le debe a quién.
• Invitá por link o email, con recordatorios automáticos.

🎯 Y ADEMÁS
• Deudas con recordatorios de vencimiento.
• Metas de ahorro con progreso y fecha estimada.
• Alertas de cotización del dólar.
• Exportá tus movimientos a CSV cuando quieras.

Mi Plata es gratis. Mi Plata Pro desbloquea toda la IA y saca los anuncios.

Tus datos son tuyos: viajan cifrados, se guardan aislados por usuario y no se venden a nadie.

Tu plata, con inteligencia.
```

## Descripción larga — variante Venezuela

```
Mi Plata es la app de finanzas personales con inteligencia artificial hecha para la economía venezolana: bolívares que pierden valor, dos tasas del dólar y ahorros repartidos entre efectivo, Zelle y cripto. Acá todo eso está integrado.

💸 CONTROL DE GASTOS SIN FRICCIÓN
• Registra movimientos en segundos; la IA les pone la categoría sola.
• Desglose del mes por categoría y comparación contra el mes anterior.
• Presupuestos con alertas al 80% y al 100%.

💵 BOLÍVARES Y DÓLARES, JUNTOS
• Todo se ve en Bs Y en dólares, siempre.
• Tasa BCV oficial y dólar paralelo actualizados todo el día — la brecha a la vista.
• Patrimonio neto consolidado: cuentas, ahorros y deudas.

💰 TUS AHORROS REALES
• Dólares en efectivo, Zelle, USDT y Bitcoin con precios en vivo.
• Pensada para una economía dolarizada: razona en USD, gasta en Bs.

🤖 ASESOR FINANCIERO CON IA (PRO)
• Chatea con un asesor que ve tus números reales y habla en venezolano.
• Resumen mensual inteligente: en qué gastaste de más y un consejo concreto para el mes que viene.

📅 PROYECCIÓN DE PAGOS
• Cuotas, vencimientos e ingresos proyectados mes a mes.
• Te avisamos con anticipación si te vas a quedar sin efectivo.

👥 GASTOS COMPARTIDOS
• Viajes, la casa o una salida: carga los gastos del grupo y calculamos quién le debe a quién.
• Invita por link o email, con recordatorios automáticos. Ideal para cuentas entre familia aquí y afuera.

🎯 Y ADEMÁS
• Deudas con recordatorios de vencimiento.
• Metas de ahorro con progreso y fecha estimada.
• Exporta tus movimientos a CSV cuando quieras.

Mi Plata es gratis. Mi Plata Pro desbloquea toda la IA y quita los anuncios.

Tus datos son tuyos: viajan cifrados, se guardan aislados por usuario y no se venden a nadie.

Tu plata, con inteligencia.
```

## Keywords objetivo (para título/descripciones, no hay campo keywords en Play)

- **AR:** finanzas personales, control de gastos, dólar blue, dólar MEP, inflación, presupuesto, inversiones, CEDEARs, plazo fijo, FCI, patrimonio, app de gastos.
- **VE:** finanzas personales, control de gastos, dólar BCV, dólar paralelo, bolívares, Zelle, USDT, presupuesto, ahorro en dólares, app de gastos.

## Assets

Generados por `python scripts/gen-play-assets.py` (idempotente; usa Space Grotesk del
paquete `@expo-google-fonts` para que la tipografía sea la misma que la app):

| Asset | Archivo | Estado |
|---|---|---|
| Ícono de Play 512×512 | `assets/play/icon-512.png` | ✅ listo para subir |
| Feature graphic 1024×500 | `assets/play/feature-graphic-1024x500.png` | ✅ listo para subir |
| Ícono de la app (1024) + adaptive + splash | `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png` | ✅ regenerados con la misma marca (entran en el próximo build nativo) |

**Pendiente: screenshots (requiere device, no se pueden generar acá).** Play pide mínimo 2 por
tipo de dispositivo; apuntar a 4–6. Cómo capturarlas:

1. Instalar el APK/AAB de preview y loguearse con el usuario de prueba **AR** (datos sembrados).
2. Capturar en este orden: **Dashboard** (patrimonio + cotizaciones) · **Movimientos** con el
   desglose por categoría · **Inversiones** con "real +X%" · **Asesor IA** con una respuesta ·
   **Proyección de pagos**.
3. Repetir logueado con el usuario **VE** para el custom listing de Venezuela (mostrar Bs,
   BCV/paralelo). Alcanza con 3–4.
4. Subirlas tal cual salen del teléfono (Play acepta 16:9/9:16, mínimo 320 px de lado corto).
   No maquetarlas con marcos ni texto inventado: tienen que ser la app real.

- Video promocional: opcional, saltear en el lanzamiento.

## Notas de lanzamiento sugeridas (release notes v0.1.0)

```
Primera versión pública de Mi Plata 🎉
• Control de gastos con categorización por IA
• Multi-moneda: ARS/Bs + USD (MEP, blue, BCV, paralelo y más)
• Inversiones con rendimiento real contra la inflación
• Asesor financiero con IA
• Proyección de pagos y gastos compartidos
```
