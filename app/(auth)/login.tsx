import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandGradient } from "../../components/BrandGradient";
import { FormInput } from "../../components/form";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { radius, spacing, shadow } from "../../lib/theme";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) {
      Alert.alert("Faltan datos", "Email y contraseña son obligatorios.");
      return;
    }
    setBusy(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) Alert.alert("Ups", error.message);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.brand}>
          <BrandGradient style={styles.logo}>
            <Text style={styles.logoText}>$</Text>
          </BrandGradient>
          <Text style={styles.title}>Mi Platica</Text>
          <Text style={styles.subtitle}>Tus finanzas, con inteligencia argentina.</Text>
        </View>

        <FormInput
          placeholder="tu@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <FormInput placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }, busy && { opacity: 0.5 }]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.btnText}>{busy ? "..." : mode === "signin" ? "Entrar" : "Crear cuenta"}</Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} hitSlop={8}>
          <Text style={styles.switch}>
            {mode === "signin" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Entrá"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing.md },
    brand: { alignItems: "center", gap: spacing.xs, marginBottom: spacing["2xl"] },
    logo: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.accent,
      ...shadow.glow,
    },
    logoText: { color: "#FFFFFF", fontSize: 38, fontWeight: "800" },
    title: { fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.5, color: c.text },
    subtitle: { fontSize: 15, lineHeight: 21, color: c.textDim, textAlign: "center" },
    btn: {
      backgroundColor: c.accent,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: "center",
      marginTop: spacing.sm,
      ...shadow.sm,
    },
    btnText: { color: c.accentContrast, fontWeight: "700", fontSize: 16 },
    switch: { color: c.accent, textAlign: "center", marginTop: spacing.lg, fontWeight: "600" },
  });
}
