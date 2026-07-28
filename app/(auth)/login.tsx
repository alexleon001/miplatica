import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";
import { BrandGradient } from "../../components/BrandGradient";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { radius, shadow, spacing } from "../../lib/theme";

type Mode = "signin" | "signup";

const CONFIRM_REDIRECT = "https://miplatica.vercel.app/confirmado";

export default function LoginScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  // Cuando queda una cuenta pendiente de confirmar, mostramos un aviso PERSISTENTE
  // en pantalla (no un Alert que se descarta y se olvida) con opción de reenviar el mail.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) {
      Alert.alert("Faltan datos", "Email y contraseña son obligatorios.");
      return;
    }
    setBusy(true);
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: CONFIRM_REDIRECT },
          });
    setBusy(false);
    if (error) {
      // Traducir el error más común a algo accionable.
      if (/not confirmed/i.test(error.message)) {
        setPendingEmail(email.trim());
        Alert.alert(
          "Falta confirmar tu correo 📬",
          `Tu cuenta existe pero todavía no está confirmada. Buscá el mail que te mandamos a ${email.trim()} (mirá spam/promociones) y tocá el enlace. Si no te llegó o venció, tocá “Reenviar correo” abajo.`,
        );
      } else {
        Alert.alert("Ups", error.message);
      }
      return;
    }
    // signUp con confirmación de email pendiente: hay user pero NO session.
    // Dejamos un aviso PERSISTENTE en pantalla (no solo un Alert descartable).
    if (mode === "signup" && !data.session) {
      setPendingEmail(email.trim());
      setMode("signin");
      Alert.alert(
        "¡Revisá tu correo! 📬",
        `Te mandamos un mail a ${email.trim()} con un enlace para activar tu cuenta (mirá spam/promociones). Cuando lo confirmes, volvé acá y entrá con tu contraseña.`,
      );
    }
  }

  async function resendConfirmation() {
    const target = (pendingEmail ?? email).trim();
    if (!target) {
      Alert.alert("Escribí tu email", "Completá tu email arriba para reenviarte el correo de confirmación.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: CONFIRM_REDIRECT },
    });
    setBusy(false);
    // "already confirmed" no es un error accionable: la cuenta ya está lista para entrar.
    if (error && !/already confirmed/i.test(error.message)) {
      Alert.alert("No pudimos reenviar", error.message);
      return;
    }
    Alert.alert(
      "Correo reenviado 📬",
      `Te enviamos un nuevo enlace a ${target} (mirá spam/promociones). Puede tardar unos minutos en llegar.`,
    );
  }

  async function forgotPassword() {
    if (!email.trim()) {
      Alert.alert("Escribí tu email", "Completá tu email arriba y volvé a tocar “¿Olvidaste tu contraseña?”.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://miplatica.vercel.app/restablecer",
    });
    setBusy(false);
    if (error) {
      Alert.alert("Ups", error.message);
      return;
    }
    Alert.alert(
      "Revisá tu correo 📬",
      `Si ${email.trim()} tiene cuenta, te llega un mail con un enlace para elegir una contraseña nueva. Después volvé acá y entrá.`,
    );
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
          <Text style={styles.title}>Mi Plata</Text>
          <Text style={styles.subtitle}>Tu plata, con inteligencia.</Text>
        </View>

        <View style={styles.segment}>
          {(["signin", "signup"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setMode(m)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {m === "signin" ? "Entrar" : "Crear cuenta"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={20} color={c.textDim} />
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={c.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={20} color={c.textDim} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={c.textDim}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={c.textDim} />
          </Pressable>
        </View>

        {pendingEmail ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              📬 Te enviamos un enlace a <Text style={styles.noticeStrong}>{pendingEmail}</Text> para activar tu
              cuenta. Revisá tu correo (mirá spam/promociones), tocá el enlace y volvé acá a entrar con tu contraseña.
            </Text>
            <Pressable onPress={resendConfirmation} hitSlop={8} disabled={busy}>
              <Text style={styles.noticeLink}>Reenviar correo de confirmación</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={c.accentContrast} />
          ) : (
            <Text style={styles.btnText}>{mode === "signin" ? "Entrar" : "Crear cuenta"}</Text>
          )}
        </Pressable>

        {mode === "signin" ? (
          <Pressable onPress={forgotPassword} hitSlop={8} disabled={busy}>
            <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>
            Al crear tu cuenta te vamos a pedir tu nombre y país para adaptar la app a tu moneda.
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing.md },
    brand: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.xl },
    logo: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
      ...shadow.glow,
    },
    logoText: { color: "#FFFFFF", fontSize: 38, fontWeight: "800" },
    title: { fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.5, color: c.text },
    subtitle: { fontSize: 15, lineHeight: 21, color: c.textDim, textAlign: "center" },
    segment: {
      flexDirection: "row",
      backgroundColor: c.surface2,
      borderRadius: radius.full,
      padding: 4,
      marginBottom: spacing.xs,
    },
    segmentItem: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: radius.full },
    segmentItemActive: { backgroundColor: c.surface, ...shadow.sm },
    segmentText: { fontSize: 14, fontWeight: "700", color: c.textDim },
    segmentTextActive: { color: c.text },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.lg,
    },
    input: { flex: 1, color: c.text, fontSize: 16, paddingVertical: spacing.lg },
    notice: {
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accent,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    noticeText: { color: c.text, fontSize: 14, lineHeight: 20 },
    noticeStrong: { fontWeight: "700", color: c.text },
    noticeLink: { color: c.accent, fontWeight: "700", fontSize: 14, textAlign: "center" },
    btn: {
      backgroundColor: c.accent,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      marginTop: spacing.sm,
      ...shadow.sm,
    },
    btnText: { color: c.accentContrast, fontWeight: "700", fontSize: 16 },
    forgot: { color: c.textDim, textAlign: "center", marginTop: spacing.md, fontSize: 13 },
    hint: { color: c.textFaint, textAlign: "center", marginTop: spacing.md, fontSize: 12, lineHeight: 17 },
  });
}
