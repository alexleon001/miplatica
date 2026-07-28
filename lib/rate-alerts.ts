// Lógica pura de alertas de cotización del dólar. El usuario configura umbrales
// ("avisame si el MEP supera $1500" / "si el Blue baja de $1000"); cuando la
// cotización del día cruza el umbral, se dispara una notificación local.
// Sin React → unit-testeable con `bun test`.
//
// Anti-spam por EDGE-TRIGGER (histéresis): cada alerta lleva un flag `triggered`.
// Notifica UNA vez al cruzar (triggered false→true) y NO vuelve a avisar mientras
// la condición se siga cumpliendo. Cuando la cotización vuelve del otro lado del
// umbral, la alerta se RE-ARMA (triggered→false) y puede volver a disparar.
//
// Multi-país: el umbral está en moneda LOCAL (ARS en AR, Bs. en VE), así que los
// textos formatean con el símbolo y el locale del país del usuario.

import { type CountryCode, countryConfig, type RateKey } from "./countries";

// El tipo de tasa es el mismo del currency store: en AR son los dólares
// argentinos (oficial/mep/blue/ccl/tarjeta) y en VE el BCV y el paralelo. Qué
// subconjunto se ofrece lo decide `countryConfig(country).usdTypes`.
export type RateType = RateKey;
export type RateDirection = "above" | "below";

export type RateAlertConfig = {
  id: string;
  rate: RateType;
  direction: RateDirection; // "above" = avisar si supera; "below" = si baja de
  threshold: number;
  triggered: boolean; // estado del edge-trigger (armada cuando es false)
};

export type RatesSnapshot = Partial<Record<RateType, number | null>>;

export type FiredRateAlert = {
  id: string;
  rate: RateType;
  direction: RateDirection;
  threshold: number;
  value: number; // cotización que disparó la alerta
};

// Evalúa todas las alertas contra la cotización actual. Devuelve las que recién
// cruzaron (a notificar) y el próximo estado `triggered` de cada una (a persistir).
export function evaluateRateAlerts(
  configs: RateAlertConfig[],
  rates: RatesSnapshot,
): { fired: FiredRateAlert[]; nextState: Record<string, boolean> } {
  const fired: FiredRateAlert[] = [];
  const nextState: Record<string, boolean> = {};

  for (const c of configs) {
    const value = rates[c.rate];
    if (value == null) {
      nextState[c.id] = c.triggered; // sin dato → no cambia
      continue;
    }
    const meets = c.direction === "above" ? value >= c.threshold : value <= c.threshold;
    if (meets && !c.triggered) {
      fired.push({ id: c.id, rate: c.rate, direction: c.direction, threshold: c.threshold, value });
      nextState[c.id] = true;
    } else if (!meets) {
      nextState[c.id] = false; // se re-arma
    } else {
      nextState[c.id] = c.triggered; // sigue cumpliendo, ya notificada
    }
  }

  return { fired, nextState };
}

const RATE_LABELS: Record<RateType, string> = {
  oficial: "Oficial",
  mep: "MEP",
  blue: "Blue",
  ccl: "CCL",
  tarjeta: "Tarjeta",
  bcv: "BCV",
  paralelo: "Paralelo",
};

export function rateLabel(rate: RateType): string {
  return RATE_LABELS[rate];
}

// Formatea un monto en la moneda local del país (ARS con "$", VES con "Bs.").
function money(amount: number, country: CountryCode): string {
  const cfg = countryConfig(country);
  const n = new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 0 }).format(Math.round(amount));
  return cfg.currencySymbol === "$" ? `$${n}` : `${cfg.currencySymbol} ${n}`;
}

// Texto del cuerpo de la notificación / fila in-app.
export function rateAlertBody(a: FiredRateAlert, country: CountryCode = "AR"): string {
  const verb = a.direction === "above" ? "superó" : "bajó de";
  return `El dólar ${RATE_LABELS[a.rate]} ${verb} ${money(a.threshold, country)} — hoy ${money(a.value, country)}.`;
}

// Descripción corta de una alerta configurada (para la lista de gestión).
export function rateAlertSummary(
  c: Pick<RateAlertConfig, "rate" | "direction" | "threshold">,
  country: CountryCode = "AR",
): string {
  const verb = c.direction === "above" ? "supera" : "baja de";
  return `${RATE_LABELS[c.rate]} ${verb} ${money(c.threshold, country)}`;
}
