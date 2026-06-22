// Selector de FCI (fondo común) con buscador. Los FCI no tienen ticker: el
// usuario elige de la lista que trae argentinadatos (useFciFunds) y devolvemos el
// FciFund completo (slug + nombre + VCP) al padre. 100% JS (OTA-safe).

import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fciCategoryLabel, filterFunds, type FciFund } from "../lib/fci";
import { useFciFunds } from "../lib/hooks/use-fci-funds";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

const vcpFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

type Props = {
  valueLabel: string; // nombre del fondo elegido ("" si ninguno)
  onChange: (fund: FciFund) => void;
  placeholder?: string;
};

export function FundField({ valueLabel, onChange, placeholder = "Elegí tu fondo" }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
        <Ionicons name="search" size={18} color={c.accent} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Elegí tu fondo</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={c.textDim} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={c.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar fondo (ej: Alpha, Galicia)…"
              placeholderTextColor={c.textDim}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={c.accent} />
              <Text style={styles.muted}>Cargando fondos…</Text>
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={26} color={c.neg} />
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    input: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: c.surface, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: c.border,
    },
    valueText: { color: c.text, fontSize: 16, flex: 1, marginRight: spacing.sm },
    placeholder: { color: c.textDim, fontSize: 16, flex: 1, marginRight: spacing.sm },
    sheet: { flex: 1, backgroundColor: c.bg, paddingTop: spacing["4xl"] },
    sheetHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    },
    sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: c.text },
    searchBar: {
      flexDirection: "row", alignItems: "center", gap: spacing.sm,
      marginHorizontal: spacing.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 15 },
    center: { alignItems: "center", justifyContent: "center", padding: spacing["3xl"], gap: spacing.md },
    muted: { fontSize: 13, color: c.textDim },
    retry: { borderWidth: 1, borderColor: c.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    retryText: { color: c.accent, fontWeight: "700" },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing["4xl"] },
    row: {
      flexDirection: "row", alignItems: "center", gap: spacing.md,
      paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    fondo: { fontSize: 15, fontWeight: "700", color: c.text },
    meta: { fontSize: 13, color: c.textDim, marginTop: 1 },
    vcp: { fontSize: 15, fontWeight: "700", color: c.textDim, fontVariant: ["tabular-nums"] },
  });
}
