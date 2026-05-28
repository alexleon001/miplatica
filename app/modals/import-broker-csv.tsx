import { useMemo, useState } from "react";
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
import { Stack, useRouter } from "expo-router";
import {
  parseBrokerCsv,
  summarizeByType,
  type ParseResult,
} from "../../lib/broker-import";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useImportTransactions } from "../../lib/hooks/use-import-transactions";
import { colors } from "../../lib/colors";

const TYPE_LABELS: Record<string, string> = {
  income: "Ingresos",
  expense: "Gastos",
  transfer: "Transferencias",
  investment: "Inversiones",
};

export default function ImportBrokerCsvModal() {
  const router = useRouter();
  const accounts = useAccounts();
  const importTx = useImportTransactions();

  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const byType = useMemo(
    () => (result ? summarizeByType(result.movements) : null),
    [result],
  );

  function analyze() {
    const parsed = parseBrokerCsv(raw);
    setResult(parsed);
    if (!accountId && accounts.data && accounts.data.length > 0) {
      setAccountId(accounts.data[0].id);
    }
  }

  async function doImport() {
    if (!result || result.movements.length === 0) {
      Alert.alert("Nada para importar", "Primero pegá un CSV y tocá Analizar.");
      return;
    }
    if (!accountId) {
      Alert.alert("Sin cuenta", "Elegí a qué cuenta asignar los movimientos.");
      return;
    }
    try {
      const res = await importTx.mutateAsync({ movements: result.movements, accountId });
      Alert.alert(
        "Importación lista",
        `Se importaron ${res.inserted} movimientos nuevos.` +
          (res.skipped > 0 ? `\n${res.skipped} ya existían (deduplicados).` : ""),
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude importar el CSV.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Importar CSV" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.help}>
            Pegá el CSV de movimientos de tu broker o banco (Cocos, PPI, IOL…). Detecto fecha,
            tipo, descripción, importe y nro de operación. Reimportar el mismo archivo no duplica.
          </Text>

          <Field label="CSV">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={"Fecha;Tipo;Especie;Importe;Nro\n01/05/2026;Compra;AAPL;-150000,50;1001"}
              placeholderTextColor={colors.textMuted}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              value={raw}
              onChangeText={setRaw}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.85 }]}
            onPress={analyze}
          >
            <Text style={styles.analyzeBtnText}>Analizar</Text>
          </Pressable>

          {result ? (
            <View style={styles.preview}>
              {result.missingColumns.length > 0 ? (
                <Text style={styles.error}>
                  No encontré las columnas: {result.missingColumns.join(", ")}. Revisá que el CSV
                  tenga encabezados (ej: Fecha, Importe).
                </Text>
              ) : (
                <>
                  <Text style={styles.previewTitle}>
                    {result.movements.length} movimientos detectados
                  </Text>
                  {byType
                    ? (Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[])
                        .filter((k) => byType[k as keyof typeof byType] > 0)
                        .map((k) => (
                          <Text key={k} style={styles.previewRow}>
                            · {TYPE_LABELS[k]}: {byType[k as keyof typeof byType]}
                          </Text>
                        ))
                    : null}
                  {result.skippedRows > 0 ? (
                    <Text style={styles.muted}>{result.skippedRows} filas ignoradas (sin fecha/importe válido).</Text>
                  ) : null}
                  {result.duplicatesInFile > 0 ? (
                    <Text style={styles.muted}>{result.duplicatesInFile} duplicados dentro del archivo.</Text>
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          {result && result.movements.length > 0 ? (
            <Field label="Importar a la cuenta">
              <View style={styles.row}>
                {accounts.data?.map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={[styles.chip, accountId === acc.id && styles.chipActive]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Text style={[styles.chipText, accountId === acc.id && styles.chipTextActive]}>
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {(!accounts.data || accounts.data.length === 0) ? (
                <Text style={styles.muted}>Agregá una cuenta primero (Patrimonio → +).</Text>
              ) : null}
            </Field>
          ) : null}

          {result && result.movements.length > 0 ? (
            <Pressable
              style={({ pressed }) => [
                styles.submit,
                pressed && { opacity: 0.85 },
                importTx.isPending && { opacity: 0.5 },
              ]}
              onPress={doImport}
              disabled={importTx.isPending}
            >
              <Text style={styles.submitText}>
                {importTx.isPending ? "Importando…" : `Importar ${result.movements.length} movimientos`}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
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
    fontSize: 14,
  },
  textarea: { minHeight: 140, textAlignVertical: "top", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  analyzeBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primary + "22",
  },
  analyzeBtnText: { color: colors.primary, fontWeight: "700" },
  preview: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  previewTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  previewRow: { color: colors.textPrimary, fontSize: 13 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  error: { color: colors.negative, fontSize: 13 },
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
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});
