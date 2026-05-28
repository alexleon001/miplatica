// Diccionario central de tipos de instrumentos de inversión.
// Único punto de verdad para label/icon/color/moneda default y qué campos
// muestra el modal add-investment por cada tipo. El campo `investments.type`
// almacena el `id` (key) de este diccionario.
//
// También vive acá `deriveInvestmentValues`: la lógica pura que, dados los
// inputs crudos del usuario + la tasa MEP, calcula los campos derivados que se
// persisten en `investments` (current_value_*, profit_loss_*, etc.). Se usa al
// crear una posición y al refrescar cotizaciones.

import { colors } from "./colors";

export type InstrumentType =
  | "fci"
  | "cedear"
  | "accion"
  | "plazo_fijo"
  | "on"
  | "bono"
  | "lecap"
  | "dolar_mep"
  | "usd_cash"
  | "crypto";

export type InstrumentCurrency = "ARS" | "USD";

// Campos que el modal puede pedir según el tipo de instrumento.
export type InstrumentField =
  | "ticker"
  | "quantity"
  | "avg_cost"
  | "interest_rate"
  | "purchase_date"
  | "maturity_date";

export type Instrument = {
  id: InstrumentType;
  label: string;
  icon: string;            // emoji (sin deps de iconos)
  color: string;           // hex (para distribución + row)
  defaultCurrency: InstrumentCurrency;
  hasLivePrice: boolean;   // tiene cotización en asset_prices (CEDEAR/acción/etc.)
  fields: InstrumentField[];
  quantityLabel: string;
  costLabel: string;       // "" si el tipo no usa costo unitario
  tickerLabel?: string;
};

export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: "fci",
    label: "Fondo común (FCI)",
    icon: "🏦",
    color: "#6366F1",
    defaultCurrency: "ARS",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost"],
    quantityLabel: "Cuotapartes",
    costLabel: "Valor x cuotaparte",
    tickerLabel: "Símbolo del fondo (opcional)",
  },
  {
    id: "cedear",
    label: "CEDEAR",
    icon: "🌎",
    color: "#0EA5E9",
    defaultCurrency: "ARS",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost"],
    quantityLabel: "Cantidad",
    costLabel: "Precio promedio",
    tickerLabel: "Ticker (ej: AAPL, KO)",
  },
  {
    id: "accion",
    label: "Acción",
    icon: "📈",
    color: "#22C55E",
    defaultCurrency: "ARS",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost"],
    quantityLabel: "Nominales",
    costLabel: "Precio promedio",
    tickerLabel: "Ticker (ej: GGAL, YPFD)",
  },
  {
    id: "plazo_fijo",
    label: "Plazo fijo",
    icon: "🔒",
    color: "#F59E0B",
    defaultCurrency: "ARS",
    hasLivePrice: false,
    fields: ["quantity", "interest_rate", "purchase_date", "maturity_date"],
    quantityLabel: "Capital",
    costLabel: "",
  },
  {
    id: "on",
    label: "Obligación negociable",
    icon: "📜",
    color: "#A855F7",
    defaultCurrency: "USD",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost"],
    quantityLabel: "Nominales",
    costLabel: "Precio promedio",
    tickerLabel: "Ticker (ej: YMCXO)",
  },
  {
    id: "bono",
    label: "Bono",
    icon: "🏛️",
    color: "#06B6D4",
    defaultCurrency: "ARS",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost"],
    quantityLabel: "Nominales",
    costLabel: "Precio promedio",
    tickerLabel: "Ticker (ej: AL30, GD30)",
  },
  {
    id: "lecap",
    label: "LECAP",
    icon: "🧾",
    color: "#84CC16",
    defaultCurrency: "ARS",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost", "maturity_date"],
    quantityLabel: "Nominales",
    costLabel: "Precio promedio",
    tickerLabel: "Ticker (ej: S31E5)",
  },
  {
    id: "dolar_mep",
    label: "Dólar MEP",
    icon: "💵",
    color: "#55EFC4",
    defaultCurrency: "USD",
    hasLivePrice: false,
    fields: ["quantity", "avg_cost"],
    quantityLabel: "Monto USD",
    costLabel: "Precio de compra (ARS x USD)",
  },
  {
    id: "usd_cash",
    label: "Dólar billete",
    icon: "💸",
    color: "#22D3A5",
    defaultCurrency: "USD",
    hasLivePrice: false,
    fields: ["quantity", "avg_cost"],
    quantityLabel: "Monto USD",
    costLabel: "Precio de compra (ARS x USD)",
  },
  {
    id: "crypto",
    label: "Cripto",
    icon: "🪙",
    color: "#F7931A",
    defaultCurrency: "USD",
    hasLivePrice: true,
    fields: ["ticker", "quantity", "avg_cost"],
    quantityLabel: "Cantidad",
    costLabel: "Precio promedio (USD)",
    tickerLabel: "Ticker (ej: BTC, ETH)",
  },
] as const;

const BY_ID = new Map(INSTRUMENTS.map((i) => [i.id, i]));

export function instrumentById(id: string | null | undefined): Instrument | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as InstrumentType);
}

export const INSTRUMENT_TYPES = INSTRUMENTS.map((i) => i.id);

// ============================================
// Derivación de valores
// ============================================

export type DeriveInput = {
  type: InstrumentType;
  currency: InstrumentCurrency;
  quantity: number;
  avgCost?: number | null;        // costo unitario en la moneda del instrumento
  currentPrice?: number | null;   // precio actual (asset_prices); si falta, usa avgCost
  interestRate?: number | null;   // % anual (plazo fijo)
  purchaseDate?: string | null;   // ISO yyyy-mm-dd
  maturityDate?: string | null;   // ISO yyyy-mm-dd
  mep: number | null;             // tasa para convertir ARS <-> USD
};

export type DerivedValues = {
  avg_cost_ars: number | null;
  avg_cost_usd: number | null;
  current_price_ars: number | null;
  current_price_usd: number | null;
  current_value_ars: number | null;
  current_value_usd: number | null;
  profit_loss_ars: number | null;
  profit_loss_usd: number | null;
  profit_loss_pct: number | null;
};

const round2 = (n: number | null): number | null => (n == null ? null : Math.round(n * 100) / 100);
const round4 = (n: number | null): number | null => (n == null ? null : Math.round(n * 10000) / 10000);
const diff = (a: number | null, b: number | null): number | null =>
  a == null || b == null ? null : round2(a - b);

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.floor(ms / 86_400_000));
}

// Interés devengado de un plazo fijo a hoy (capado a la fecha de vencimiento).
function accruedInterest(
  principal: number,
  ratePct: number | null | undefined,
  purchaseDate: string | null | undefined,
  maturityDate: string | null | undefined,
): number {
  if (!ratePct || !purchaseDate) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const end = maturityDate && maturityDate < today ? maturityDate : today;
  const days = daysBetween(purchaseDate, end);
  return principal * (ratePct / 100) * (days / 365);
}

export function deriveInvestmentValues(i: DeriveInput): DerivedValues {
  const mep = i.mep && i.mep > 0 ? i.mep : null;
  const toUsd = (ars: number | null): number | null => (ars == null ? null : mep ? ars / mep : null);
  const toArs = (usd: number | null): number | null => (usd == null ? null : mep ? usd * mep : null);

  // ── Plazo fijo: valor = capital + interés devengado a hoy ──────────────
  if (i.type === "plazo_fijo") {
    const principal = i.quantity;
    const accrued = accruedInterest(principal, i.interestRate, i.purchaseDate, i.maturityDate);
    const valueNative = principal + accrued;
    const isArs = i.currency === "ARS";
    const value_ars = isArs ? valueNative : toArs(valueNative);
    const value_usd = isArs ? toUsd(valueNative) : valueNative;
    const cost_ars = isArs ? principal : toArs(principal);
    const cost_usd = isArs ? toUsd(principal) : principal;
    return {
      avg_cost_ars: round4(cost_ars),
      avg_cost_usd: round4(cost_usd),
      current_price_ars: null,
      current_price_usd: null,
      current_value_ars: round2(value_ars),
      current_value_usd: round2(value_usd),
      profit_loss_ars: diff(value_ars, cost_ars),
      profit_loss_usd: diff(value_usd, cost_usd),
      profit_loss_pct: principal > 0 ? round4((accrued / principal) * 100) : 0,
    };
  }

  // ── Dólar (MEP / billete): se tiene USD; el rendimiento real está en ARS ─
  if (i.type === "dolar_mep" || i.type === "usd_cash") {
    const usd = i.quantity;
    const buyArsPerUsd = i.avgCost ?? mep ?? null; // costo en ARS por dólar
    const cost_ars = buyArsPerUsd != null ? usd * buyArsPerUsd : toArs(usd);
    const value_ars = mep != null ? usd * mep : cost_ars;
    return {
      avg_cost_ars: round4(buyArsPerUsd),
      avg_cost_usd: 1,
      current_price_ars: round4(mep),
      current_price_usd: 1,
      current_value_ars: round2(value_ars),
      current_value_usd: round2(usd),
      profit_loss_ars: diff(value_ars, cost_ars),
      profit_loss_usd: 0,
      profit_loss_pct:
        cost_ars != null && cost_ars > 0 && value_ars != null
          ? round4(((value_ars - cost_ars) / cost_ars) * 100)
          : 0,
    };
  }

  // ── Instrumentos de mercado (cedear, acción, fci, on, bono, lecap, cripto) ─
  const price = i.currentPrice ?? i.avgCost ?? 0;
  const cost = i.avgCost ?? 0;
  const valueNative = i.quantity * price;
  const costNative = i.quantity * cost;
  const isArs = i.currency === "ARS";
  const value_ars = isArs ? valueNative : toArs(valueNative);
  const value_usd = isArs ? toUsd(valueNative) : valueNative;
  const cost_ars = isArs ? costNative : toArs(costNative);
  const cost_usd = isArs ? toUsd(costNative) : costNative;
  return {
    avg_cost_ars: isArs ? round4(cost) : round4(toArs(cost)),
    avg_cost_usd: isArs ? round4(toUsd(cost)) : round4(cost),
    current_price_ars: isArs ? round4(price) : round4(toArs(price)),
    current_price_usd: isArs ? round4(toUsd(price)) : round4(price),
    current_value_ars: round2(value_ars),
    current_value_usd: round2(value_usd),
    profit_loss_ars: diff(value_ars, cost_ars),
    profit_loss_usd: diff(value_usd, cost_usd),
    profit_loss_pct: costNative > 0 ? round4(((valueNative - costNative) / costNative) * 100) : 0,
  };
}
