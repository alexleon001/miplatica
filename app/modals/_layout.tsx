import { Stack } from "expo-router";
import { colors } from "../../lib/colors";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceDark },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.backgroundDark },
        presentation: "modal",
      }}
    />
  );
}
