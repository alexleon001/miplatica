import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  type CurrencyDisplay,
  type UsdType,
  useCurrencyStore,
} from "../lib/store/currency";
import { colors, radius, spacing } from "../lib/theme";

const DISPLAY_OPTIONS: { value: CurrencyDisplay; label: string }[] = [
  { value: "ars", label: "ARS" },
  { value: "usd", label: "USD" },
  { value: "both", label: "Ambas" },
];

const USD_OPTIONS: { value: UsdType; label: string }[] = [
  { value: "mep", label: "MEP" },
  { value: "blue", label: "Blue" },
  { value: "oficial", label: "Oficial" },
  { value: "ccl", label: "CCL" },
];

export function CurrencyToggle() {
  const display = useCurrencyStore((s) => s.display);
  const usdType = useCurrencyStore((s) => s.usdType);
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const setUsdType = useCurrencyStore((s) => s.setUsdType);

  return (
    <View style={styles.wrap}>
      {/* Segmented control: se lee como un solo control en vez de 3 chips sueltos. */}
      <View style={styles.segment}>
        {DISPLAY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setDisplay(opt.value)}
            style={[styles.segmentItem, display === opt.value && styles.segmentItemActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: display === opt.value }}
          >
            <Text style={[styles.segmentText, display === opt.value && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {display !== "ars" ? (
        <View style={styles.row}>
          {USD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setUsdType(opt.value)}
              style={[styles.chipSm, usdType === opt.value && styles.chipSmActive]}
            >
              <Text style={[styles.chipSmText, usdType === opt.value && styles.chipSmTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: "#FFFFFF" },
  row: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  chipSm: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSmActive: { backgroundColor: colors.usd, borderColor: colors.usd },
  chipSmText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  chipSmTextActive: { color: colors.backgroundDark },
});
