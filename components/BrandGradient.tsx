// Gradiente de marca indigo→cyan. `expo-linear-gradient` es un módulo NATIVO: si
// el binario (APK) no lo trae —p.ej. estos cambios se entregan por OTA a un APK
// viejo sin el módulo— el render del LinearGradient falla. Este error boundary lo
// captura y cae a un fondo sólido indigo, así nunca rompe la pantalla. En un APK
// rebuildeado con el módulo, muestra el gradiente real.

import { Component, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../lib/theme";

type Props = {
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "none" | "auto" | "box-none" | "box-only";
  children?: ReactNode;
};

export class BrandGradient extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { style, pointerEvents, children } = this.props;
    if (this.state.failed) {
      return (
        <View style={[style, { backgroundColor: colors.primaryDeep }]} pointerEvents={pointerEvents}>
          {children}
        </View>
      );
    }
    return (
      <LinearGradient {...gradients.brand} style={style} pointerEvents={pointerEvents}>
        {children}
      </LinearGradient>
    );
  }
}
