// Lista de plantillas recurrentes con opción de borrar. Vive en "Más". Si no hay
// ninguna, muestra una ayuda de cómo crearlas.

import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoryById } from "../lib/categories";
import { useRecurringStore } from "../lib/store/recurring";
import { templateLabel } from "../lib/recurring";
import { confirmDelete } from "../lib/confirm";
import { useTheme } from "../lib/theme-context";
import type { Palette } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

const TYPE_LABEL: Record<string, string> = { income: "Ingreso", expense: "Gasto", transfer: "Transf." };

export function RecurringList() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const templates = useRecurringStore((s) => s.templates);
  const remove = useRecurringStore((s) => s.remove);

  if (templates.length === 0) {
    return (
      <Text style={styles.muted}>
        Marcá “Repetir todos los meses” al crear un movimiento y aparece acá para registrarlo de un toque cada mes.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {templates.map((t) => {
        const cat = categoryById(t.category);
        return (
          <View key={t.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label} numberOfLines={1}>
                {cat?.icon ?? "🔁"} {templateLabel(t)}
              </Text>
              <Text style={styles.sub}>
                {TYPE_LABEL[t.type] ?? t.type}
                {cat?.label ? ` · ${cat.label}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => confirmDelete(t.description ?? "este recurrente", () => remove(t.id))}
              hitSlop={8}
              style={styles.delBtn}
              accessibilityLabel="Borrar recurrente"
            >
              <Ionicons name="trash-outline" size={16} color={c.neg} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    muted: { fontSize: 13, lineHeight: 18, color: c.textDim },
    list: { gap: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    label: { fontSize: 15, color: c.text },
    sub: { fontSize: 13, color: c.textDim },
    delBtn: {
      width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center",
      backgroundColor: c.surface2,
    },
  });
}
