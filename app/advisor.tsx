import { useEffect, useRef, useState } from "react";
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
import { type AdvisorMessage, useAdvisor } from "../lib/hooks/use-advisor";
import { useAdvisorChatStore } from "../lib/store/advisor";
import { useKeyboardHeight } from "../lib/hooks/use-keyboard-height";
import { colors, radius, spacing, typography } from "../lib/theme";

const SUGGESTIONS = [
  "¿Cómo viene mi mes?",
  "¿En qué me conviene ahorrar hoy?",
  "¿Tengo gastos que pueda recortar?",
  "¿Cómo le gano a la inflación?",
];

export default function AdvisorScreen() {
  const router = useRouter();
  const advisor = useAdvisor();
  // Historial persistido (sobrevive al cierre de la app). Ver lib/store/advisor.
  const messages = useAdvisorChatStore((s) => s.messages);
  const setMessages = useAdvisorChatStore((s) => s.setMessages);
  const clearChat = useAdvisorChatStore((s) => s.clear);
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

    const next: AdvisorMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

    try {
      const reply = await advisor.mutateAsync(next);
      setMessages([...next, { role: "assistant", content: reply }]);
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
          <Ionicons name="chevron-back" size={22} color={colors.primaryBright} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Ionicons name="sparkles" size={15} color={colors.primaryBright} />
          <Text style={styles.title}>Asesor IA</Text>
        </View>
        {messages.length > 0 ? (
          <Pressable onPress={confirmClear} hitSlop={12} accessibilityLabel="Nueva conversación">
            <Text style={styles.clear}>Limpiar</Text>
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <View style={{ flex: 1, marginBottom: kbHeight }}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧉</Text>
            <Text style={styles.emptyTitle}>Tu asesor financiero argentino</Text>
            <Text style={styles.emptyText}>
              Preguntame sobre tu plata: ve tus cuentas, inversiones, deudas y
              presupuestos. No invento datos.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
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
                  <ActivityIndicator color={colors.textMuted} size="small" />
                  <Text style={styles.typingText}>Pensando…</Text>
                </View>
              ) : null
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escribí tu pregunta…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={() => send(input)}
            editable={!advisor.isPending}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (pressed || advisor.isPending || !input.trim()) && { opacity: 0.5 },
            ]}
            onPress={() => send(input)}
            disabled={advisor.isPending || !input.trim()}
            accessibilityLabel="Enviar mensaje"
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: AdvisorMessage }) {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  backBtn: { width: 56 },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  clear: { color: colors.textMuted, fontSize: 14, fontWeight: "600", width: 56, textAlign: "right" },
  title: { ...typography.heading, color: colors.textPrimary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["3xl"], gap: spacing.md },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { ...typography.heading, color: colors.textPrimary, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  suggestions: { gap: spacing.sm, marginTop: spacing.md, alignSelf: "stretch" },
  suggestion: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  suggestionText: { ...typography.body, color: colors.textPrimary },
  list: { padding: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: "85%", borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: radius.sm },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUserText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21 },
  bubbleAssistantText: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  typing: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  typingText: { color: colors.textMuted, fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
