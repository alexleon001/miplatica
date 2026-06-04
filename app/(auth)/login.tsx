import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandGradient } from "../../components/BrandGradient";
import { FormInput } from "../../components/form";
import { supabase } from "../../lib/supabase";
import { colors, radius, spacing, typography, shadow } from "../../lib/theme";

type Mode = "signin" | "signup";

export default function LoginScreen() {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing.md },
  brand: { alignItems: "center", gap: spacing.xs, marginBottom: spacing["2xl"] },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    ...shadow.glow,
  },
  logoText: { color: "#FFFFFF", fontSize: 38, fontWeight: "800" },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  switch: { color: colors.primaryBright, textAlign: "center", marginTop: spacing.lg, fontWeight: "600" },
});
