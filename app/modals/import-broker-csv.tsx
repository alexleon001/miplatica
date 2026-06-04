import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChipRow, form, FormChip, FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import {
  parseBrokerCsv,
  summarizeByType,
  type ParseResult,
} from "../../lib/broker-import";
import { useAccounts } from "../../lib/hooks/use-accounts";
import { useImportTransactions } from "../../lib/hooks/use-import-transactions";
import { colors, radius, spacing, typography } from "../../lib/theme";

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
    <FormScreen title="Importar CSV">
      <Text style={styles.help}>
        Pegá el CSV de movimientos de tu broker o banco (Cocos, PPI, IOL…). Detecto fecha,
        tipo, descripción, importe y nro de operación. Reimportar el mismo archivo no duplica.
      </Text>

      <FormField label="CSV">
        <FormInput
          style={styles.textarea}
          placeholder={"Fecha;Tipo;Especie;Importe;Nro\n01/05/2026;Compra;AAPL;-150000,50;1001"}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          value={raw}
          onChangeText={setRaw}
        />
      </FormField>

      <Pressable style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.85 }]} onPress={analyze}>
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
              <Text style={styles.previewTitle}>{result.movements.length} movimientos detectados</Text>
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
        <FormField
          label="Importar a la cuenta"
          hint={!accounts.data || accounts.data.length === 0 ? "Agregá una cuenta primero (Patrimonio → +)." : undefined}
        >
          <ChipRow>
            {accounts.data?.map((acc) => (
              <FormChip key={acc.id} label={acc.name} active={accountId === acc.id} onPress={() => setAccountId(acc.id)} />
            ))}
          </ChipRow>
        </FormField>
      ) : null}

      {result && result.movements.length > 0 ? (
        <SubmitButton
          label={importTx.isPending ? "Importando…" : `Importar ${result.movements.length} movimientos`}
          onPress={doImport}
          busy={importTx.isPending}
        />
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  help: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  textarea: {
    ...form.multiline,
    minHeight: 140,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  analyzeBtn: {
    borderWidth: 1,
    borderColor: colors.primary + "55",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
  },
  analyzeBtnText: { color: colors.primaryBright, fontWeight: "700" },
  preview: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  previewTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  previewRow: { ...typography.caption, color: colors.textPrimary },
  muted: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  error: { ...typography.caption, color: colors.negative },
});
