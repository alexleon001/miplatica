import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { useAppFonts } from "../lib/fonts";
import { claimGroupInvites } from "../lib/hooks/use-group-members";
import { useProfile } from "../lib/hooks/use-profile";
import { syncPurchasesUser } from "../lib/purchases";
import { QueryProvider } from "../lib/query-provider";
import {
  type CurrencyDisplay,
  type UsdType,
  useCurrencyStore,
} from "../lib/store/currency";
import { ThemeProvider, useTheme } from "../lib/theme-context";

export default function RootLayout() {
  // Carga Space Grotesk (Fase F) y parchea <Text> para mapear fontWeight→familia.
  // Si falla, igual seguimos (cae a la fuente del sistema) para no colgar el boot.
  const fontsReady = useAppFonts();
  if (!fontsReady) return null; // breve: los assets de fuente son locales (ms)

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

// Luminancia aproximada de un hex (#RRGGBB) → 0..255. Para decidir íconos de la
// status bar / contraste sin depender de strings.
function brightness(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// La barra de estado sigue el modo del tema (texto claro en oscuro, oscuro en claro).
function ThemedStatusBar() {
  const c = useTheme();
  return <StatusBar style={brightness(c.bg) < 128 ? "light" : "dark"} />;
}

function AuthGate() {
  const c = useTheme();
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

  // RevenueCat sigue al usuario de Supabase (logIn con el UUID → el webhook
  // escribe `entitlements` con el user correcto). No-op si el módulo nativo o
  // la API key no están (APK viejo, Expo Go, Fase 2 sin configurar).
  const userId = session?.user.id ?? null;
  useEffect(() => {
    void syncPurchasesUser(userId);
    // Modelo híbrido de gastos compartidos: al loguearse, vincula los miembros
    // "fantasma" cuyo email coincide con el del usuario (invitaciones pendientes).
    if (userId) void claimGroupInvites();
  }, [userId]);

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
          backgroundColor: c.bg,
        }}
      >
        <ActivityIndicator color={c.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="advisor" />
      <Stack.Screen name="projection" />
      <Stack.Screen name="rate-alerts" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="invest-sim" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="modals" options={{ presentation: "modal" }} />
    </Stack>
  );
}
