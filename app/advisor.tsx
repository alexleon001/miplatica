import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProLock } from "../components/ProLock";
import { RewardCreditsChip } from "../components/RewardCreditsChip";
import { type AdvisorMessage, useAdvisor } from "../lib/hooks/use-advisor";
import { usePro } from "../lib/hooks/use-pro";
import { invalidateRewardCredits, useRewardCredits } from "../lib/hooks/use-reward-credits";
import { useAdvisorChatStore } from "../lib/store/advisor";
import { useCurrencyStore } from "../lib/store/currency";
import { countryConfig } from "../lib/countries";
import { useKeyboardHeight } from "../lib/hooks/use-keyboard-height";
import { useTheme } from "../lib/theme-context";
import { type Palette, withAlpha } from "../lib/theme-tokens";
import { radius, spacing } from "../lib/theme";

// La última sugerencia es por país: en VE la capa de inflación está apagada
// (no hay fuente API), así que preguntar por el IPC no lleva a ningún lado.
const SUGGESTIONS_BASE = [
  "¿Cómo viene mi mes?",
  "¿En qué me conviene ahorrar hoy?",
  "¿Tengo gastos que pueda recortar?",
];
const SUGGESTION_BY_COUNTRY: Record<string, string> = {
  AR: "¿Cómo le gano a la inflación?",
  VE: "¿Cuánto me conviene tener en dólares?",
};

export default function AdvisorScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { isPro } = usePro();
  // Puente Free→Pro: cada crédito de rewarded ad paga un mensaje al asesor.
  const reward = useRewardCredits({ enabled: !isPro });
  const canUseAi = isPro || reward.credits > 0;
  const advisor = useAdvisor();
  // Historial persistido (sobrevive al cierre de la app). Ver lib/store/advisor.
  const messages = useAdvisorChatStore((s) => s.messages);
  const setMessages = useAdvisorChatStore((s) => s.setMessages);
  const clearChat = useAdvisorChatStore((s) => s.clear);
  const country = useCurrencyStore((s) => s.country);
  const suggestions = useMemo(
    () => [...SUGGESTIONS_BASE, SUGGESTION_BY_COUNTRY[country] ?? SUGGESTION_BY_COUNTRY.AR],
    [country],
  );
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<AdvisorMessage>>(null);
  // KeyboardAvoidingView no es confiable bajo Fabric (ver CLAUDE.md): subimos la
  // barra de input a mano con la altura real del teclado.
  const kbHeight = useKeyboardHeight();

  // Al abrir el teclado, dejamos visible el final del chat.
  useEffect(() => {
    if (kbHeight > 0 && messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [kbHeight, messages.length]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || advisor.isPending) return;
    // Sin crédito ni Pro no gastamos: el hint de "mirá un anuncio" guía al usuario.
    if (!canUseAi) return;

    const next: AdvisorMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

    try {
      const reply = await advisor.mutateAsync(next);
      setMessages([...next, { role: "assistant", content: reply }]);
      // El mensaje consumió un crédito server-side (si no es Pro): refrescamos.
      if (!isPro) invalidateRewardCredits();
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Ups, no pude responder ahora. " +
            (e instanceof Error ? e.message : "Probá de nuevo en un rato."),
        },
      ]);
    } finally {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  function confirmClear() {
    if (advisor.isPending) return;
    Alert.alert("Nueva conversación", "¿Borrar el historial del chat?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: () => clearChat() },
    ]);
  }

  async function handleWatchAd() {
    const result = await reward.watchAdForCredit();
    if (result === "no_credit") {
      Alert.alert("Por hoy no", "Llegaste al tope de usos gratis de hoy. Probá mañana o pasate a Pro.");
    } else if (result === "unavailable") {
      Alert.alert("Anuncio no disponible", "No pudimos cargar el anuncio. Probá de nuevo en un rato.");
    }
    // earned → reward.credits sube y se habilita el envío; dismissed → sin acción.
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Volver"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={c.accent} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Ionicons name="sparkles" size={15} color={c.accent} />
          <Text style={styles.title}>Asistente IA</Text>
        </View>
        {messages.length > 0 ? (
          <Pressable onPress={confirmClear} hitSlop={12} accessibilityLabel="Nueva conversación">
            <Text style={styles.clear}>Limpiar</Text>
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {reward.credits > 0 && !isPro ? (
        <View style={styles.chipRow}>
          <RewardCreditsChip credits={reward.credits} isPro={isPro} />
        </View>
      ) : null}

      {!canUseAi && messages.length === 0 ? (
        <ProLock
          title="El asistente IA es Pro"
          subtitle="Chateá sobre tu plata con un asistente que ve tus cuentas, inversiones y deudas reales. Desbloquealo con Mi Plata Pro."
          onWatchAd={reward.adsAvailable ? handleWatchAd : undefined}
          watching={reward.watching}
        />
      ) : (
      <View style={{ flex: 1, marginBottom: kbHeight }}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            {/* El emoji y el título eran fijos "argentinos": a un usuario VE le
                hablaba de un asesor argentino. Ahora sigue al país del perfil. */}
            <Text style={styles.emptyIcon}>{countryConfig(country).flag}</Text>
            <Text style={styles.emptyTitle}>Tu asistente de finanzas</Text>
            <Text style={styles.emptyText}>
              Preguntame sobre tu plata: ve tus cuentas, inversiones, deudas y
              presupuestos. No invento datos.
            </Text>
            {/* Play: declaramos que la app NO ofrece asesoramiento financiero.
                El aviso tiene que estar donde el usuario lee las respuestas. */}
            <Text style={styles.disclaimer}>
              Orientativo, generado por IA con tus datos. No es asesoramiento financiero profesional.
            </Text>
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.8 }]}
                  onPress={() => send(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <Bubble message={item} />}
            ListFooterComponent={
              advisor.isPending ? (
                <View style={[styles.bubble, styles.bubbleAssistant, styles.typing]}>
                  <ActivityIndicator color={c.textDim} size="small" />
                  <Text style={styles.typingText}>Pensando…</Text>
                </View>
              ) : null
            }
          />
        )}

        {!canUseAi ? (
          <Pressable
            style={({ pressed }) => [styles.adHint, (pressed || reward.watching) && { opacity: 0.7 }]}
            onPress={handleWatchAd}
            disabled={reward.watching || !reward.adsAvailable}
            accessibilityRole="button"
            accessibilityLabel="Mirá un anuncio para enviar otro mensaje"
          >
            {reward.watching ? (
              <ActivityIndicator size="small" color={c.accent} />
            ) : (
              <Ionicons name="play-circle-outline" size={18} color={c.accent} />
            )}
            <Text style={styles.adHintText}>
              {reward.adsAvailable
                ? "Mirá un anuncio para enviar otro mensaje"
                : "Pasate a Pro para seguir chateando"}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escribí tu pregunta…"
            placeholderTextColor={c.textDim}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={() => send(input)}
            editable={!advisor.isPending && canUseAi}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (pressed || advisor.isPending || !input.trim() || !canUseAi) && { opacity: 0.5 },
            ]}
            onPress={() => send(input)}
            disabled={advisor.isPending || !input.trim() || !canUseAi}
            accessibilityLabel="Enviar mensaje"
          >
            <Ionicons name="arrow-up" size={20} color={c.accentContrast} />
          </Pressable>
        </View>
      </View>
      )}
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: AdvisorMessage }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
      ]}
    >
      <Text style={isUser ? styles.bubbleUserText : styles.bubbleAssistantText}>
        {message.content}
      </Text>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backBtn: { width: 56 },
    titleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    clear: { color: c.textDim, fontSize: 14, fontWeight: "600", width: 56, textAlign: "right" },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["3xl"], gap: spacing.md },
    emptyIcon: { fontSize: 44 },
    emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text, textAlign: "center" },
    emptyText: { fontSize: 15, color: c.textDim, textAlign: "center", lineHeight: 20 },
    disclaimer: { fontSize: 11.5, color: c.textFaint, textAlign: "center", lineHeight: 16, marginTop: spacing.sm },
    suggestions: { gap: spacing.sm, marginTop: spacing.md, alignSelf: "stretch" },
    suggestion: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    suggestionText: { fontSize: 15, color: c.text },
    list: { padding: spacing.lg, gap: spacing.md },
    bubble: { maxWidth: "85%", borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    bubbleUser: { alignSelf: "flex-end", backgroundColor: c.accent, borderBottomRightRadius: radius.sm },
    bubbleAssistant: {
      alignSelf: "flex-start",
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
    },
    bubbleUserText: { color: c.accentContrast, fontSize: 15, lineHeight: 21 },
    bubbleAssistantText: { color: c.text, fontSize: 15, lineHeight: 21 },
    typing: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    typingText: { color: c.textDim, fontSize: 14 },
    chipRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    adHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.27),
    },
    adHintText: { color: c.accent, fontWeight: "700", fontSize: 13 },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
