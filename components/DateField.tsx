// Selector de fecha (calendario) 100% JS — sin módulos nativos (OTA-safe).
// Reemplaza el TextInput "AAAA-MM-DD" a mano. Devuelve/recibe "YYYY-MM-DD".
//
// Uso:
//   <DateField value={date} onChange={setDate} placeholder="Elegí una fecha" />
//
// El valor vacío ("") significa "sin fecha". El picker abre un Modal con la
// grilla del mes (lun→dom), flechas de mes y atajos Hoy / Limpiar.

import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// "YYYY-MM-DD" → {y,m,d} sin saltos de zona horaria (parseo de string).
function parseYMD(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayParts(): { y: number; m: number; d: number } {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

// Etiqueta humana de "YYYY-MM-DD" → "10 de junio de 2026".
export function formatDateLabel(s: string): string {
  const p = parseYMD(s);
  if (!p) return s;
  return `${p.d} de ${MONTHS_ES[p.m].toLowerCase()} de ${p.y}`;
}

// Días que ocupa el mes (m: 0-based) empezando en lunes.
function buildGrid(y: number, m: number): (number | null)[] {
  const first = new Date(y, m, 1);
  const startWeekday = (first.getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type Props = {
  value: string; // "YYYY-MM-DD" o ""
  onChange: (next: string) => void;
  placeholder?: string;
  /** Permitir limpiar (default true). */
  clearable?: boolean;
};

export function DateField({ value, onChange, placeholder = "Elegí una fecha", clearable = true }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseYMD(value), [value]);

  // Mes visible en el calendario (independiente del valor seleccionado).
  const initial = selected ?? todayParts();
  const [viewY, setViewY] = useState(initial.y);
  const [viewM, setViewM] = useState(initial.m);

  function openPicker() {
    const base = parseYMD(value) ?? todayParts();
    setViewY(base.y);
    setViewM(base.m);
    setOpen(true);
  }

  function shiftMonth(delta: number) {
    const idx = viewY * 12 + viewM + delta;
    setViewY(Math.floor(idx / 12));
    setViewM(idx % 12);
  }

  const grid = useMemo(() => buildGrid(viewY, viewM), [viewY, viewM]);
  const today = todayParts();

  function pick(d: number) {
    onChange(toYMD(viewY, viewM, d));
    setOpen(false);
  }

  return (
    <>
      <Pressable style={styles.input} onPress={openPicker}>
        <Text style={value ? styles.valueText : styles.placeholder}>
          {value ? formatDateLabel(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={c.accent} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.navRow}>
              <Pressable hitSlop={12} onPress={() => shiftMonth(-1)}>
                <Text style={styles.navArrow}>‹</Text>
              </Pressable>
              <Text style={styles.navTitle}>{MONTHS_ES[viewM]} {viewY}</Text>
              <Pressable hitSlop={12} onPress={() => shiftMonth(1)}>
                <Text style={styles.navArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={styles.weekday}>{w}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {grid.map((d, i) => {
                if (d == null) return <View key={i} style={styles.cell} />;
                const isSel = selected && selected.y === viewY && selected.m === viewM && selected.d === d;
                const isToday = today.y === viewY && today.m === viewM && today.d === d;
                return (
                  <Pressable
                    key={i}
                    style={[styles.cell, isSel && styles.cellSelected, !isSel && isToday && styles.cellToday]}
                    onPress={() => pick(d)}
                  >
                    <Text style={[styles.cellText, isSel && styles.cellTextSelected]}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              {clearable && value ? (
                <Pressable onPress={() => { onChange(""); setOpen(false); }}>
                  <Text style={styles.clear}>Limpiar</Text>
                </Pressable>
              ) : <View />}
              <Pressable onPress={() => { const t = todayParts(); onChange(toYMD(t.y, t.m, t.d)); setOpen(false); }}>
                <Text style={styles.todayBtn}>Hoy</Text>
              </Pressable>
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
    navTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    weekRow: { flexDirection: "row" },
    weekday: { flex: 1, textAlign: "center", color: c.textDim, fontSize: 12, fontWeight: "600" },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
    cellSelected: { backgroundColor: c.accent },
    cellToday: { borderWidth: 1, borderColor: c.accent },
    cellText: { color: c.text, fontSize: 15 },
    cellTextSelected: { color: c.accentContrast, fontWeight: "700" },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs, paddingHorizontal: spacing.xs },
    clear: { color: c.neg, fontSize: 14, fontWeight: "600" },
    todayBtn: { color: c.accent, fontSize: 14, fontWeight: "700" },
  });
}
