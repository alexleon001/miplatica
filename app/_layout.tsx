import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { useProfile } from "../lib/hooks/use-profile";
import { QueryProvider } from "../lib/query-provider";
import {
  type CurrencyDisplay,
  type UsdType,
  useCurrencyStore,
} from "../lib/store/currency";
import { colors } from "../lib/colors";

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate />
      </AuthProvider>
    </QueryProvider>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  const profileQuery = useProfile();
  const router = useRouter();
  const segments = useSegments() as string[];

  // Sincroniza el currency store con las preferencias del profile al cargar.
  // El profile gana al default del store; el toggle local sigue funcionando.
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const setUsdType = useCurrencyStore((s) => s.setUsdType);
  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setDisplay(p.currency_display as CurrencyDisplay);
    setUsdType(p.preferred_usd_type as UsdType);
  }, [profileQuery.data, setDisplay, setUsdType]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const needsOnboarding = !!session && profileQuery.data !== undefined && !profileQuery.data?.name;

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && needsOnboarding && segments[1] !== "onboarding") {
      router.replace("/(auth)/onboarding");
    } else if (session && inAuthGroup && !needsOnboarding) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments, router, profileQuery.data]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.backgroundDark,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.backgroundDark } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="advisor" />
      <Stack.Screen name="projection" />
      <Stack.Screen name="rate-alerts" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="invest-sim" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="modals" options={{ presentation: "modal" }} />
    </Stack>
  );
}
