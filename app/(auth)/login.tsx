import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { colors } from "../../lib/colors";

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
        <Text style={styles.title}>Mi Platica</Text>
        <Text style={styles.subtitle}>Tus finanzas, con inteligencia argentina.</Text>

        <TextInput
          style={styles.input}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }, busy && { opacity: 0.5 }]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.btnText}>
            {busy ? "..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
          <Text style={styles.switch}>
            {mode === "signin"
              ? "¿No tenés cuenta? Registrate"
              : "¿Ya tenés cuenta? Entrá"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  input: {
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: colors.textPrimary, fontWeight: "600", fontSize: 16 },
  switch: { color: colors.textMuted, textAlign: "center", marginTop: 16 },
});
