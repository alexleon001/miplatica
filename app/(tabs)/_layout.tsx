import { Tabs } from "expo-router";
import { colors } from "../../lib/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundDark },
        headerTintColor: colors.textPrimary,
        tabBarStyle: {
          backgroundColor: colors.surfaceDark,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Patrimonio" }} />
      <Tabs.Screen name="transactions" options={{ title: "Movimientos" }} />
      <Tabs.Screen name="investments" options={{ title: "Inversiones" }} />
      <Tabs.Screen name="debts" options={{ title: "Deudas" }} />
      <Tabs.Screen name="more" options={{ title: "Más" }} />
    </Tabs>
  );
}
