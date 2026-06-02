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
import { type AdvisorMessage, useAdvisor } from "../lib/hooks/use-advisor";
import { useAdvisorChatStore } from "../lib/store/advisor";
import { useKeyboardHeight } from "../lib/hooks/use-keyboard-height";
import { colors } from "../lib/colors";

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
        >
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Asesor IA</Text>
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
            <Text style={styles.sendBtnText}>➤</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.primary, fontSize: 16, fontWeight: "600", width: 56 },
  clear: { color: colors.textMuted, fontSize: 14, fontWeight: "600", width: 56, textAlign: "right" },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  suggestions: { gap: 8, marginTop: 12, alignSelf: "stretch" },
  suggestion: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionText: { color: colors.textPrimary, fontSize: 14 },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: "85%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUserText: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  bubbleAssistantText: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  typing: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { color: colors.textMuted, fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
});
