// Selector de FCI (fondo común) con buscador. Los FCI no tienen ticker: el
// usuario elige de la lista que trae argentinadatos (useFciFunds) y devolvemos el
// FciFund completo (slug + nombre + VCP) al padre. 100% JS (OTA-safe).

import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fciCategoryLabel, filterFunds, type FciFund } from "../lib/fci";
import { useFciFunds } from "../lib/hooks/use-fci-funds";
import { colors, radius, spacing, typography } from "../lib/theme";

const vcpFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

type Props = {
  valueLabel: string; // nombre del fondo elegido ("" si ninguno)
  onChange: (fund: FciFund) => void;
  placeholder?: string;
};

export function FundField({ valueLabel, onChange, placeholder = "Elegí tu fondo" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: funds, isLoading, isError, refetch } = useFciFunds();

  const filtered = useMemo(() => filterFunds(funds ?? [], query), [funds, query]);

  function pick(fund: FciFund) {
    onChange(fund);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={valueLabel ? styles.valueText : styles.placeholder} numberOfLines={1}>
          {valueLabel || placeholder}
        </Text>
        <Ionicons name="search" size={18} color={colors.primaryBright} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Elegí tu fondo</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar fondo (ej: Alpha, Galicia)…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primaryBright} />
              <Text style={styles.muted}>Cargando fondos…</Text>
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={26} color={colors.negative} />
              <Text style={styles.muted}>No pude cargar la lista de fondos.</Text>
              <Pressable style={styles.retry} onPress={() => refetch()}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(f) => f.slug}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={[styles.muted, { textAlign: "center", padding: spacing.xl }]}>Ningún fondo coincide.</Text>}
              renderItem={({ item }) => (
                <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} onPress={() => pick(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fondo} numberOfLines={1}>{item.fondo}</Text>
                    <Text style={styles.meta}>{fciCategoryLabel(item.category)} · al {item.fecha}</Text>
                  </View>
                  <Text style={styles.vcp}>${vcpFmt.format(item.vcp)}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surfaceDark, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  valueText: { color: colors.textPrimary, fontSize: 16, flex: 1, marginRight: spacing.sm },
  placeholder: { color: colors.textMuted, fontSize: 16, flex: 1, marginRight: spacing.sm },
  sheet: { flex: 1, backgroundColor: colors.backgroundDark, paddingTop: spacing["4xl"] },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  sheetTitle: { ...typography.title, color: colors.textPrimary },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginHorizontal: spacing.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surfaceDark, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  center: { alignItems: "center", justifyContent: "center", padding: spacing["3xl"], gap: spacing.md },
  muted: { ...typography.caption, color: colors.textMuted },
  retry: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.primaryBright, fontWeight: "700" },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing["4xl"] },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  fondo: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  vcp: { ...typography.bodyStrong, color: colors.usd, fontVariant: ["tabular-nums"] },
});
