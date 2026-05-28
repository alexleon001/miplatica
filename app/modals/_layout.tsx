import { Stack } from "expo-router";
import { colors } from "../../lib/colors";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundDark },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.backgroundDark },
        presentation: "modal",
      }}
    />
  );
}
