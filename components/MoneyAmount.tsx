// Componente único para renderizar montos. Consume useCurrencyStore para decidir
// si mostrar moneda local, USD o ambas, y useTheme para el color vivo del
// rediseño "Línea". El formato y la moneda local salen de la config de país
// (lib/countries): AR formatea ARS en es-AR, VE formatea VES en es-VE.
// La prop `ars` es el "slot de moneda local" (ARS en AR, VES en VE).

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { countryConfig, type CountryConfig } from "../lib/countries";
import { useCurrencyStore } from "../lib/store/currency";
import { useTheme } from "../lib/theme-context";

type Size = "sm" | "md" | "lg" | "xl";
type Tone = "default" | "positive" | "negative" | "warning";

type MoneyAmountProps = {
  ars?: number | null;
  usd?: number | null;
  size?: Size;
  tone?: Tone;
};

// Formateadores por país (memoizados por código). Hermes/RN tiene Intl limitado
// para algunos locales; si falta data de es-VE/VES, degrada a un formato genérico
// (dígitos + código) sin romper la UI.
function makeFormatters(cfg: CountryConfig) {
  return {
    localFmt: new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.currencyCode,
      maximumFractionDigits: 0,
    }),
    usdFmt: new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }),
  };
}

const SIZES: Record<Size, { primary: number; secondary: number }> = {
  sm: { primary: 14, secondary: 11 },
  md: { primary: 20, secondary: 13 },
  lg: { primary: 32, secondary: 16 },
  xl: { primary: 40, secondary: 18 },
};

export function MoneyAmount({ ars, usd, size = "md", tone = "default" }: MoneyAmountProps) {
  const c = useTheme();
  const display = useCurrencyStore((s) => s.display);
  const country = useCurrencyStore((s) => s.country);
  const { localFmt, usdFmt } = useMemo(() => makeFormatters(countryConfig(country)), [country]);
  const { primary, secondary } = SIZES[size];

  const toneColor = (t: Tone): string =>
    t === "positive" ? c.pos : t === "negative" ? c.neg : t === "warning" ? c.warn : c.text;
  const primaryColor = toneColor(tone);

  const showArs = display === "ars" || display === "both";
  const showUsd = display === "usd" || display === "both";

  const arsText = ars == null ? "—" : localFmt.format(ars);
  const usdText = usd == null ? "—" : usdFmt.format(usd);

  if (display === "ars") {
    return (
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.primary, { fontSize: primary, color: primaryColor }]}>
        {arsText}
      </Text>
    );
  }
  if (display === "usd") {
    return (
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.primary, { fontSize: primary, color: primaryColor }]}>
        {usdText}
      </Text>
    );
  }

  return (
    <View style={styles.stack}>
      {showArs && (
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.primary, { fontSize: primary, color: tone === "default" ? c.text : primaryColor }]}>
          {arsText}
        </Text>
      )}
      {/* Ocultamos la línea secundaria USD cuando no hay dato (evita "—" de relleno). */}
      {showUsd && usd != null && (
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.secondary, { fontSize: secondary, color: tone === "default" ? c.textDim : primaryColor }]}>
          {usdText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 2 },
  primary: { fontWeight: "600", fontVariant: ["tabular-nums"] },
  secondary: { fontWeight: "500", fontVariant: ["tabular-nums"] },
});
