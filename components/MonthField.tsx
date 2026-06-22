// Selector de mes+año 100% JS (OTA-safe). Reemplaza el TextInput "AAAA-MM".
// Devuelve/recibe "YYYY-MM". Abre un Modal con stepper de año + 12 meses.

import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseYM(s: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1 };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatMonthLabel(s: string): string {
  const p = parseYM(s);
  if (!p) return s;
  return `${MONTHS_FULL[p.m]} ${p.y}`;
}

type Props = {
  value: string; // "YYYY-MM"
  onChange: (next: string) => void;
  placeholder?: string;
};

export function MonthField({ value, onChange, placeholder = "Elegí el mes" }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const sel = parseYM(value);
  const now = new Date();
  const [viewY, setViewY] = useState(sel?.y ?? now.getFullYear());

  function openPicker() {
    setViewY(parseYM(value)?.y ?? now.getFullYear());
    setOpen(true);
  }

  function pick(m: number) {
    onChange(`${viewY}-${pad(m + 1)}`);
    setOpen(false);
  }

  return (
    <>
      <Pressable style={styles.input} onPress={openPicker}>
        <Text style={value ? styles.valueText : styles.placeholder}>
          {value ? formatMonthLabel(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={c.accent} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.navRow}>
              <Pressable hitSlop={12} onPress={() => setViewY((y) => y - 1)}>
                <Text style={styles.navArrow}>‹</Text>
              </Pressable>
              <Text style={styles.navTitle}>{viewY}</Text>
              <Pressable hitSlop={12} onPress={() => setViewY((y) => y + 1)}>
                <Text style={styles.navArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.grid}>
              {MONTHS_ES.map((label, m) => {
                const isSel = sel && sel.y === viewY && sel.m === m;
                return (
                  <Pressable
                    key={m}
                    style={[styles.monthCell, isSel && styles.monthCellSelected]}
                    onPress={() => pick(m)}
                  >
                    <Text style={[styles.monthText, isSel && styles.monthTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
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
    valueText: { color: c.text, fontSize: 16 },
    placeholder: { color: c.textDim, fontSize: 16 },
    backdrop: { flex: 1, backgroundColor: "#000B", alignItems: "center", justifyContent: "center", padding: spacing["2xl"] },
    card: {
      width: "100%", maxWidth: 360, backgroundColor: c.surface2, borderRadius: radius.xl,
      borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.md,
    },
    navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.sm },
    navArrow: { color: c.accent, fontSize: 30, fontWeight: "700", width: 36, textAlign: "center" },
    navTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    monthCell: {
      flexGrow: 1, flexBasis: "22%", // ~4 por fila con gap
      paddingVertical: spacing.md, alignItems: "center", borderRadius: radius.md,
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
    },
    monthCellSelected: { backgroundColor: c.accent, borderColor: c.accent },
    monthText: { color: c.text, fontSize: 14, fontWeight: "600" },
    monthTextSelected: { color: c.accentContrast, fontWeight: "700" },
  });
}
