// Skeletons (placeholders animados) para estados de carga — mejor perceived
// performance que un "Cargando…". Pulso de opacidad con Animated (sin deps).

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import { useTheme } from "../lib/theme-context";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 14, radius = 8, style }: SkeletonProps) {
  const c = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: c.surface2, opacity }, style]}
    />
  );
}

// Filas tipo lista (icono + dos líneas + monto a la derecha), para FlatLists.
export function RowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={40} height={40} radius={12} />
          <View style={styles.lines}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={64} height={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  lines: { flex: 1, gap: 6 },
});
