// Config multi-país: fuente única de verdad de todo lo que cambia entre países.
// La app nació para Argentina; este módulo abstrae "lo argentino" detrás de un
// `country` (guardado en profiles.country y espejado en el currency store) para
// poder servir Venezuela (Bs/USD) con el mismo binario y backend.
//
// Principio clave: las columnas `_ars` de la base son el "slot de moneda local"
// del usuario. En AR guardan ARS, en VE guardan VES. No se migra nada: el país
// decide cómo se rotula/formatea ese slot y qué cotizaciones lo convierten a USD.

import type { InstrumentType } from "./instruments";

export type CountryCode = "AR" | "VE";

// Tipos de "dólar"/tasa para convertir moneda local <-> USD. AR tiene varios;
// VE tiene BCV (oficial) y paralelo. Es la unión que vive en el currency store.
export type RateKey = "oficial" | "blue" | "mep" | "ccl" | "tarjeta" | "bcv" | "paralelo";

export type CountryConfig = {
  code: CountryCode;
  name: string;
  flag: string;             // emoji (sin deps de iconos)
  locale: string;           // formato de números (es-AR / es-VE)
  currencyCode: string;     // ISO 4217 del slot local (ARS / VES)
  currencyLabel: string;    // etiqueta corta para el toggle ("ARS" / "Bs.")
  currencySymbol: string;   // símbolo para prefijar montos ("$" / "Bs.")
  usdTypes: { value: RateKey; label: string }[];
  defaultUsdType: RateKey;
  ratesEndpoint: string;    // endpoint dolarapi para fetch-exchange-rates
  features: {
    inflation: boolean;     // ajuste por inflación + banner (AR: INDEC; VE: sin fuente API)
    mercadoPago: boolean;   // integración Mercado Pago (solo AR)
  };
  instruments: InstrumentType[]; // qué instrumentos ofrece el modal de inversión
};

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  AR: {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    locale: "es-AR",
    currencyCode: "ARS",
    currencyLabel: "ARS",
    currencySymbol: "$",
    usdTypes: [
      { value: "mep", label: "MEP" },
      { value: "blue", label: "Blue" },
      { value: "oficial", label: "Oficial" },
      { value: "ccl", label: "CCL" },
      { value: "tarjeta", label: "Tarjeta" },
    ],
    defaultUsdType: "mep",
    ratesEndpoint: "https://dolarapi.com/v1/dolares",
    features: { inflation: true, mercadoPago: true },
    instruments: [
      "fci", "cedear", "accion", "plazo_fijo", "on", "bono", "lecap",
      "dolar_mep", "usd_cash", "crypto",
    ],
  },
  VE: {
    code: "VE",
    name: "Venezuela",
    flag: "🇻🇪",
    locale: "es-VE",
    currencyCode: "VES",
    currencyLabel: "Bs.",
    currencySymbol: "Bs.",
    usdTypes: [
      { value: "bcv", label: "BCV" },
      { value: "paralelo", label: "Paralelo" },
    ],
    defaultUsdType: "paralelo",
    ratesEndpoint: "https://ve.dolarapi.com/v1/dolares",
    // Sin fuente API confiable de inflación (el OVF publica reportes web, no JSON)
    // ni medios de pago con API abierta → esas capas se ocultan en VE.
    features: { inflation: false, mercadoPago: false },
    // El retail venezolano ahorra en USD billete y cripto (USDT/BTC son la norma).
    instruments: ["usd_cash", "crypto"],
  },
};

export const DEFAULT_COUNTRY: CountryCode = "AR";

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

// Resuelve la config de un código (tolerante a null/desconocido → default AR).
export function countryConfig(code: string | null | undefined): CountryConfig {
  return COUNTRIES[code as CountryCode] ?? COUNTRIES[DEFAULT_COUNTRY];
}
