import { Stack } from "expo-router";
import { colors } from "../../lib/colors";

export default function GroupsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceDark },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.backgroundDark },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Gastos compartidos" }} />
      <Stack.Screen name="[id]" options={{ title: "Grupo" }} />
    </Stack>
  );
}
