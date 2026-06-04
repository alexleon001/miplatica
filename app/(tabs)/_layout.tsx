import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  // Respeta la barra de gestos/botones del sistema (Android/iOS): sin esto el
  // tab bar se solapa con los botones de volver/recientes del celular.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceDark,
          borderTopColor: colors.borderSoft,
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarActiveTintColor: colors.primaryBright,
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
