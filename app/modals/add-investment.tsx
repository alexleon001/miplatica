import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  INSTRUMENTS,
  instrumentById,
  type InstrumentCurrency,
  type InstrumentField,
  type InstrumentType,
} from "../../lib/instruments";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useAssetPrice } from "../../lib/hooks/use-asset-price";
import { isPriceStale, staleLabel } from "../../lib/prices";
import { useCreateInvestment, useUpdateInvestment } from "../../lib/hooks/use-create-investment";
import { useInvestments } from "../../lib/hooks/use-investments";
import { useExchangeRates } from "../../lib/hooks/use-exchange-rates";
import { useCurrencyStore } from "../../lib/store/currency";
import { colors } from "../../lib/colors";

const CURRENCIES: InstrumentCurrency[] = ["ARS", "USD"];

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

export default function AddInvestmentModal() {
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

  // Cotización live del ticker (solo para instrumentos de mercado).
  const liveTicker = instrument.hasLivePrice ? ticker : "";
  const assetPrice = useAssetPrice(liveTicker);
  const livePrice = useMemo<number | null>(() => {
    if (!instrument.hasLivePrice || !assetPrice.data) return null;
    return (currency === "ARS" ? assetPrice.data.price_ars : assetPrice.data.price_usd) ?? null;
  }, [instrument.hasLivePrice, assetPrice.data, currency]);

  const mep = useMemo<number | null>(() => {
    if (!rates.data) return null;
    return rates.data[usdType] ?? rates.data.mep ?? null;
  }, [rates.data, usdType]);

  async function submit() {
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

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? "Editar inversión" : "Nueva inversión" }} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <Field label="Tipo de instrumento">
            <View style={styles.row}>
              {INSTRUMENTS.map((ins) => (
                <Pressable
                  key={ins.id}
                  style={[styles.chip, type === ins.id && styles.chipActive]}
                  onPress={() => changeType(ins.id)}
                >
                  <Text style={[styles.chipText, type === ins.id && styles.chipTextActive]}>
                    {ins.icon} {ins.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Nombre">
            <TextInput
              style={styles.input}
              placeholder={instrument.label}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </Field>

          {has("ticker") ? (
            <Field label={instrument.tickerLabel ?? "Ticker"}>
              <TextInput
                style={styles.input}
                placeholder="AAPL"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={ticker}
                onChangeText={setTicker}
              />
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
            </Field>
          ) : null}

          <Field label="Moneda">
            <View style={styles.row}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, currency === c && styles.chipActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={instrument.quantityLabel}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </Field>

          {has("avg_cost") ? (
            <Field label={instrument.costLabel || "Costo"}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={avgCost}
                onChangeText={setAvgCost}
              />
            </Field>
          ) : null}

          {has("interest_rate") ? (
            <Field label="Tasa anual (%)">
              <TextInput
                style={styles.input}
                placeholder="ej: 35"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={interestRate}
                onChangeText={setInterestRate}
              />
            </Field>
          ) : null}

          {has("purchase_date") ? (
            <Field label="Fecha de inicio (AAAA-MM-DD)">
              <TextInput
                style={styles.input}
                placeholder="2026-05-01"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
              />
            </Field>
          ) : null}

          {has("maturity_date") ? (
            <Field label="Vencimiento (AAAA-MM-DD)">
              <TextInput
                style={styles.input}
                placeholder="2026-08-01"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={maturityDate}
                onChangeText={setMaturityDate}
              />
            </Field>
          ) : null}

          {accounts.data && accounts.data.length > 0 ? (
            <Field label="Cuenta (opcional)">
              <View style={styles.row}>
                {accounts.data.map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={[styles.chip, accountId === acc.id && styles.chipActive]}
                    onPress={() => setAccountId(accountId === acc.id ? null : acc.id)}
                  >
                    <Text style={[styles.chipText, accountId === acc.id && styles.chipTextActive]}>
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.submit,
              pressed && { opacity: 0.85 },
              (create.isPending || update.isPending) && { opacity: 0.5 },
            ]}
            onPress={submit}
            disabled={create.isPending || update.isPending}
          >
            <Text style={styles.submitText}>
              {create.isPending || update.isPending
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Guardar inversión"}
            </Text>
          </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { padding: 20, gap: 16 },
  field: { gap: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.textPrimary },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  hintStale: { color: colors.warning },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
