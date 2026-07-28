# Política de Privacidad — Mi Platica

**Última actualización: 10 de junio de 2026**

Mi Platica ("la app") es una aplicación de finanzas personales desarrollada por Alexander León ("nosotros"). Esta política explica qué datos recopilamos, para qué los usamos y con quién los compartimos. Al usar la app, aceptás esta política.

**Contacto:** alexanderleon001@gmail.com

## 1. Datos que recopilamos

### Datos de cuenta
- **Email y contraseña** (la contraseña se almacena hasheada, nunca en texto plano), usados únicamente para crear y autenticar tu cuenta.
- **Nombre y preferencias** que cargás en el onboarding (moneda preferida, tipo de dólar, ingreso mensual estimado).

### Datos financieros que vos cargás
- Cuentas, movimientos (gastos/ingresos), inversiones, deudas, metas de ahorro, presupuestos y proyecciones de pago.
- Estos datos son tuyos: los cargás vos (o los importás vos, p. ej. CSV de tu broker) y se usan exclusivamente para mostrarte tu información dentro de la app.

### Datos de Mercado Pago (opcional)
- Si conectás tu cuenta de Mercado Pago (flujo OAuth oficial), sincronizamos tus **pagos aprobados** para registrarlos como movimientos. Los tokens de acceso se guardan **cifrados**. Nunca vemos tu contraseña de Mercado Pago. Podés desconectar la integración cuando quieras.

### Datos de uso de IA
- Si usás las funciones de inteligencia artificial (asistente, resumen mensual, categorización automática), un resumen de tus datos financieros (montos agregados, categorías, descripciones de movimientos) se envía a **Anthropic** (proveedor del modelo Claude) para generar la respuesta. Anthropic no usa estos datos para entrenar sus modelos según sus términos de servicio API.
- Registramos un contador diario de llamadas de IA por usuario para aplicar límites de uso.

### Datos de suscripción (Mi Platica Pro)
- Las compras se procesan a través de **Google Play** y se gestionan con **RevenueCat**. Recibimos el estado de tu suscripción (activa/vencida) asociado a tu ID de usuario. No vemos ni almacenamos datos de tu tarjeta.

### Publicidad (solo usuarios Free)
- La versión gratuita muestra anuncios mediante **Google AdMob**. AdMob puede recopilar identificadores de publicidad del dispositivo y datos de uso para mostrar anuncios (personalizados o no, según tu consentimiento). Donde la ley lo exige, pedimos tu consentimiento mediante el formulario de Google (UMP) antes de mostrar anuncios. Los usuarios Pro no ven anuncios.

## 2. Para qué usamos los datos

- Mostrarte tus finanzas (patrimonio, movimientos, inversiones, proyecciones).
- Generar análisis y sugerencias con IA cuando vos lo pedís.
- Sincronizar tus pagos de Mercado Pago si conectaste tu cuenta.
- Gestionar tu suscripción Pro.
- Mostrar anuncios en la versión gratuita.

**No vendemos tus datos.** No compartimos tus datos financieros con terceros salvo los procesadores listados abajo, y solo en la medida necesaria para que la app funcione.

## 3. Dónde se almacenan los datos

Tus datos se almacenan en **Supabase** (PostgreSQL gestionado), en servidores ubicados en **São Paulo, Brasil (región AWS sa-east-1)**, protegidos con aislamiento por usuario (Row Level Security): cada usuario solo puede leer y escribir sus propios datos.

Algunas preferencias (configuración de notificaciones, categorías personalizadas, historial de chat del asistente) se guardan **localmente en tu dispositivo** y no salen de él.

## 4. Procesadores de datos (terceros)

| Servicio | Para qué | Datos que recibe |
|---|---|---|
| Supabase | Base de datos y autenticación | Email, datos financieros que cargás |
| Anthropic (Claude) | Funciones de IA | Resumen de tus datos financieros al usar la IA |
| Mercado Pago | Sincronización de pagos (opcional) | Autorización OAuth que vos otorgás |
| RevenueCat / Google Play | Suscripciones Pro | ID de usuario, estado de la suscripción |
| Google AdMob | Anuncios (solo Free) | Identificadores de publicidad del dispositivo |

Las cotizaciones (dólar, acciones, FCI, inflación) se consultan a APIs públicas **sin enviar ningún dato personal tuyo**.

## 5. Tus derechos

- **Acceso y portabilidad:** podés exportar tus movimientos a CSV desde la app.
- **Rectificación:** podés editar o borrar cualquier dato desde la app.
- **Eliminación:** podés pedir la eliminación completa de tu cuenta y todos tus datos escribiendo a alexanderleon001@gmail.com. Procesamos las solicitudes dentro de los 30 días.
- **Revocar Mercado Pago:** podés desvincular la app desde tu cuenta de Mercado Pago en cualquier momento.

## 6. Seguridad

- Toda la comunicación viaja cifrada (HTTPS/TLS).
- Tokens de terceros (Mercado Pago) cifrados en reposo.
- Las claves de API de los servicios de IA viven solo en el servidor, nunca en tu dispositivo.

## 7. Menores

La app no está dirigida a menores de 13 años y no recopilamos datos de menores a sabiendas.

## 8. Cambios a esta política

Si cambiamos esta política de forma sustancial, lo vamos a avisar dentro de la app. La versión vigente siempre está disponible en esta página.

## 9. Aviso sobre la IA

Las respuestas del asistente y los resúmenes generados por IA son **orientativos** y no constituyen asesoramiento financiero, impositivo ni legal profesional.
