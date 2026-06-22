import { Stack } from "expo-router";
import { useTheme } from "../../lib/theme-context";

export default function GroupsLayout() {
  const c = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Gastos compartidos" }} />
      <Stack.Screen name="[id]" options={{ title: "Grupo" }} />
    </Stack>
  );
}
