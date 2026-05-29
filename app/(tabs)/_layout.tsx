import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRemindersSync } from "../../lib/hooks/use-reminders-sync";
import { colors } from "../../lib/colors";

type IoniconName = keyof typeof Ionicons.glyphMap;

// Ícono por tab, con variante filled/outline según foco.
function tabIcon(focused: string, unfocused: string) {
  return ({ color, size, focused: isFocused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={(isFocused ? focused : unfocused) as IoniconName} size={size} color={color} />
  );
}

export default function TabsLayout() {
  // Programa/reprograma notificaciones locales de vencimientos al entrar a la app.
  useRemindersSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceDark,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Patrimonio", tabBarIcon: tabIcon("wallet", "wallet-outline") }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: "Movimientos", tabBarIcon: tabIcon("swap-horizontal", "swap-horizontal-outline") }}
      />
      <Tabs.Screen
        name="investments"
        options={{ title: "Inversiones", tabBarIcon: tabIcon("trending-up", "trending-up-outline") }}
      />
      <Tabs.Screen
        name="debts"
        options={{ title: "Deudas", tabBarIcon: tabIcon("card", "card-outline") }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "Más", tabBarIcon: tabIcon("ellipsis-horizontal", "ellipsis-horizontal-outline") }}
      />
    </Tabs>
  );
}
