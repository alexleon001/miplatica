import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { DateField } from "../../components/DateField";
import { FundField } from "../../components/FundField";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChipRow, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import {
  INSTRUMENTS,
  instrumentById,
  type InstrumentCurrency,
  type InstrumentField,
  type InstrumentType,
} from "../../lib/instruments";
import type { FciFund } from "../../lib/fci";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useAssetPrice } from "../../lib/hooks/use-asset-price";
import { useFciFundsBySlug } from "../../lib/hooks/use-fci-funds";
import { isPriceStale, staleLabel } from "../../lib/prices";
import { useCreateInvestment, useUpdateInvestment } from "../../lib/hooks/use-create-investment";
import { useInvestments } from "../../lib/hooks/use-investments";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { useCurrencyStore } from "../../lib/store/currency";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";

const vcpFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

const CURRENCIES: InstrumentCurrency[] = ["ARS", "USD"];

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

export default function AddInvestmentModal() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const accounts = useAccounts();
  const investments = useInvestments();
  const create = useCreateInvestment();
  const update = useUpdateInvestment();
  const rates = useExchangeRates();
  const usdType = useCurrencyStore((s) => s.usdType);

  const [type, setType] = useState<InstrumentType>("cedear");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [currency, setCurrency] = useState<InstrumentCurrency>("ARS");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const prefilled = useRef(false);

  const instrument = instrumentById(type)!;
  const has = (f: InstrumentField) => instrument.fields.includes(f);

  // Cambio de tipo (acción del usuario): alinea la moneda al default del
  // instrumento. En modo edición no usamos un effect sobre `type` para no
  // pisar la moneda precargada.
  function changeType(next: InstrumentType) {
    setType(next);
    setCurrency(instrumentById(next)!.defaultCurrency);
  }

  // Modo edición: precargar desde la cache de inversiones (una sola vez).
  useEffect(() => {
    if (!editing || prefilled.current || !investments.data) return;
    const inv = investments.data.find((i) => i.id === id);
    if (!inv) return;
    setType(inv.type as InstrumentType);
    setName(inv.name);
    setTicker(inv.ticker ?? "");
    setCurrency(inv.currency as InstrumentCurrency);
    setQuantity(String(inv.quantity));
    const cost = inv.currency === "USD" ? inv.avg_cost_usd : inv.avg_cost_ars;
    setAvgCost(cost != null ? String(cost) : "");
    setInterestRate(inv.interest_rate != null ? String(inv.interest_rate) : "");
    setPurchaseDate(inv.purchase_date ?? "");
    setMaturityDate(inv.maturity_date ?? "");
    setAccountId(inv.account_id ?? null);
    prefilled.current = true;
  }, [editing, id, investments.data]);

  const isFci = type === "fci";

  // FCI: el "ticker" es el slug del fondo y la cotización es el VCP (no vive en
  // asset_prices). Lo resolvemos de la lista de fondos (useFciFunds) por slug.
  // Solo se trae la lista si el tipo es FCI (evita red en altas de otros tipos).
  const fciFundsBySlug = useFciFundsBySlug(isFci);
  const fciVcp = isFci && ticker ? (fciFundsBySlug.get(ticker)?.vcp ?? null) : null;

  // Al elegir un fondo: nombre = fondo, ticker = slug, y prellena el costo con el
  // VCP actual si el campo está vacío (compra "a hoy").
  function pickFund(fund: FciFund) {
    setTicker(fund.slug);
    setName(fund.fondo);
    setCurrency("ARS");
    if (!avgCost.trim()) setAvgCost(String(fund.vcp));
  }

  // Cotización live del ticker (solo para instrumentos de mercado, no FCI).
  const liveTicker = instrument.hasLivePrice && !isFci ? ticker : "";
  const assetPrice = useAssetPrice(liveTicker);
  const livePrice = useMemo<number | null>(() => {
    if (isFci) return fciVcp;
    if (!instrument.hasLivePrice || !assetPrice.data) return null;
    return (currency === "ARS" ? assetPrice.data.price_ars : assetPrice.data.price_usd) ?? null;
  }, [isFci, fciVcp, instrument.hasLivePrice, assetPrice.data, currency]);

  const mep = useMemo<number | null>(() => {
    if (!rates.data) return null;
    return rates.data[usdType] ?? rates.data.mep ?? null;
  }, [rates.data, usdType]);

  async function submit() {
    if (isFci && !ticker.trim()) {
      Alert.alert("Elegí un fondo", "Buscá y seleccioná tu FCI de la lista.");
      return;
    }
    const qty = parseNum(quantity);
    if (!quantity.trim() || Number.isNaN(qty) || qty <= 0) {
      Alert.alert("Cantidad inválida", "Ingresá un número mayor a cero.");
      return;
    }

    const cost = has("avg_cost") && avgCost.trim() ? parseNum(avgCost) : null;
    if (cost != null && Number.isNaN(cost)) {
      Alert.alert("Costo inválido", "Usá solo números (ej: 1250 o 1250,50).");
      return;
    }

    const finalName = name.trim() || ticker.trim().toUpperCase() || instrument.label;

    const input = {
      type,
      name: finalName,
      ticker: ticker.trim() ? ticker.trim().toUpperCase() : null,
      currency,
      quantity: qty,
      avgCost: cost,
      currentPrice: livePrice,
      interestRate: has("interest_rate") && interestRate.trim() ? parseNum(interestRate) : null,
      purchaseDate: has("purchase_date") && purchaseDate.trim() ? purchaseDate.trim() : null,
      maturityDate: has("maturity_date") && maturityDate.trim() ? maturityDate.trim() : null,
      accountId,
      mep,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: id!, input });
      } else {
        await create.mutateAsync(input);
      }
      router.back();
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude guardar la inversión.");
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <FormScreen title={editing ? "Editar inversión" : "Nueva inversión"}>
      <FormField label="Tipo de instrumento">
        <ChipRow>
          {INSTRUMENTS.map((ins) => (
            <FormChip key={ins.id} label={`${ins.icon} ${ins.label}`} active={type === ins.id} onPress={() => changeType(ins.id)} />
          ))}
        </ChipRow>
      </FormField>

      {isFci ? (
        <FormField label="Fondo común (FCI)">
          <FundField valueLabel={name} onChange={pickFund} placeholder="Buscá y elegí tu fondo" />
          {ticker ? (
            fciVcp != null ? (
              <Text style={styles.hint}>
                VCP actual: ${vcpFmt.format(fciVcp)} ARS
                {fciFundsBySlug.get(ticker)?.fecha ? ` · al ${fciFundsBySlug.get(ticker)?.fecha}` : ""}
              </Text>
            ) : (
              <Text style={styles.hint}>Cargando cotización del fondo…</Text>
            )
          ) : (
            <Text style={styles.hint}>El valor de la cuotaparte (VCP) se actualiza solo desde CAFCI.</Text>
          )}
        </FormField>
      ) : (
        <>
          <FormField label="Nombre">
            <FormInput placeholder={instrument.label} value={name} onChangeText={setName} />
          </FormField>

          {has("ticker") ? (
            <FormField label={instrument.tickerLabel ?? "Ticker"}>
              <FormInput placeholder="AAPL" autoCapitalize="characters" value={ticker} onChangeText={setTicker} />
              {instrument.hasLivePrice && ticker.trim() ? (
                livePrice != null && isPriceStale(assetPrice.data?.fetched_at) ? (
                  <Text style={[styles.hint, styles.hintStale]}>
                    Precio actual: {arsFmt.format(livePrice)} {currency} · ⚠ {staleLabel(assetPrice.data?.fetched_at)}
                  </Text>
                ) : (
                  <Text style={styles.hint}>
                    {assetPrice.isLoading
                      ? "Buscando precio…"
                      : livePrice != null
                        ? `Precio actual: ${arsFmt.format(livePrice)} ${currency}`
                        : "Sin cotización cacheada (se usa tu costo promedio)."}
                  </Text>
                )
              ) : null}
            </FormField>
          ) : null}
        </>
      )}

      {!isFci ? (
        <FormField label="Moneda">
          <ChipRow>
            {CURRENCIES.map((c) => (
              <FormChip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
            ))}
          </ChipRow>
        </FormField>
      ) : null}

      <FormField label={instrument.quantityLabel}>
        <FormInput placeholder="0" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
      </FormField>

      {has("avg_cost") ? (
        <FormField label={instrument.costLabel || "Costo"}>
          <FormInput placeholder="0" keyboardType="decimal-pad" value={avgCost} onChangeText={setAvgCost} />
        </FormField>
      ) : null}

      {has("interest_rate") ? (
        <FormField label="Tasa anual (%)">
          <FormInput placeholder="ej: 35" keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} />
        </FormField>
      ) : null}

      {has("purchase_date") ? (
        <FormField label="Fecha de inicio">
          <DateField value={purchaseDate} onChange={setPurchaseDate} placeholder="Elegí la fecha de inicio" />
        </FormField>
      ) : null}

      {has("maturity_date") ? (
        <FormField label="Vencimiento">
          <DateField value={maturityDate} onChange={setMaturityDate} placeholder="Elegí el vencimiento" />
        </FormField>
      ) : null}

      {accounts.data && accounts.data.length > 0 ? (
        <FormField label="Cuenta (opcional)">
          <ChipRow>
            {accounts.data.map((acc) => (
              <FormChip
                key={acc.id}
                label={acc.name}
                active={accountId === acc.id}
                onPress={() => setAccountId(accountId === acc.id ? null : acc.id)}
              />
            ))}
          </ChipRow>
        </FormField>
      ) : null}

      <SubmitButton
        label={busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar inversión"}
        onPress={submit}
        busy={busy}
      />
    </FormScreen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    hint: { fontSize: 13, color: c.textDim, marginTop: 4 },
    hintStale: { color: c.warn },
  });
}
