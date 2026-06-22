// Detalle de un grupo: balances simplificados ("quién le debe a quién"), acciones
// (agregar gasto / saldar / invitar / compartir) e historial de gastos.

import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CtaButton, IconChip, SectionLabel } from "../../components/ui";
import { MoneyAmount } from "../../components/MoneyAmount";
import { useAuth } from "../../lib/auth";
import { categoryById } from "../../lib/categories";
import { confirmDelete } from "../../lib/confirm";
import { useGroup } from "../../lib/hooks/use-group";
import { useRemindDebtor } from "../../lib/hooks/use-group-members";
import { useDeleteSharedExpense } from "../../lib/hooks/use-shared-expenses";
import { settlementText } from "../../lib/splits";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { radius, spacing, shadow } from "../../lib/theme";

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function GroupDetailScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const delExpense = useDeleteSharedExpense();
  const remind = useRemindDebtor();
  const { session } = useAuth();

  const memberById = useMemo(
    () => new Map((group.data?.members ?? []).map((m) => [m.id, m])),
    [group.data?.members],
  );
  const nameOf = (memberId: string) => memberById.get(memberId)?.display_name ?? "?";
  const myMemberId = (group.data?.members ?? []).find((m) => m.user_id === session?.user.id)?.id;

  if (group.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}><ActivityIndicator color={c.accent} size="large" /></View>
      </SafeAreaView>
    );
  }
  if (!group.data) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}><Text style={styles.muted}>No pude cargar el grupo.</Text></View>
      </SafeAreaView>
    );
  }

  const { group: g, members, expenses } = group.data;
  const transfers = group.transfers;

  function remindDebtor(fromId: string, toId: string, amount: number) {
    const debtor = memberById.get(fromId);
    if (!debtor?.email) {
      Alert.alert("Sin email", `${debtor?.display_name ?? "Esa persona"} no tiene email cargado. Editá el miembro para invitarlo con su correo.`);
      return;
    }
    remind.mutate(
      { debtorId: fromId, creditorId: toId, amount },
      {
        onSuccess: () => Alert.alert("Recordatorio enviado", `Le mandamos un mail a ${debtor.display_name}.`),
        onError: (e) => Alert.alert("Ups", e instanceof Error ? e.message : "No pude enviar el recordatorio."),
      },
    );
  }

  async function share() {
    const txt = settlementText(g.name, transfers, nameOf, (n) => arsFmt.format(n));
    try {
      await Share.share({ message: txt });
    } catch {
      // cancelado
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: g.name }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Acciones: la principal full-width, las secundarias en una fila pareja. */}
        <CtaButton label="Agregar gasto" icon="add-circle-outline" onPress={() => router.push(`/modals/add-shared-expense?groupId=${g.id}`)} />
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <CtaButton label="Saldar" icon="checkmark-done-outline" variant="outline" onPress={() => router.push(`/modals/settle-up?groupId=${g.id}`)} />
          </View>
          <View style={styles.actionItem}>
            <CtaButton label="Invitar" icon="person-add-outline" variant="outline" onPress={() => router.push(`/modals/invite-member?groupId=${g.id}`)} />
          </View>
          <View style={styles.actionItem}>
            <CtaButton label="Compartir" icon="share-outline" variant="outline" onPress={share} />
          </View>
        </View>

        {/* Balances simplificados */}
        <View style={styles.section}>
          <SectionLabel>Quién le debe a quién</SectionLabel>
          {transfers.length === 0 ? (
            <Text style={styles.muted}>¡Están a mano! No hay deudas pendientes.</Text>
          ) : (
            transfers.map((t, i) => (
              <View key={`${t.from}-${t.to}-${i}`} style={styles.transfer}>
                <Pressable
                  style={styles.transferMain}
                  onPress={() => router.push(`/modals/settle-up?groupId=${g.id}&from=${t.from}&to=${t.to}&amount=${t.amount}`)}
                >
                  <Text style={styles.transferText}>
                    <Text style={styles.bold}>{nameOf(t.from)}</Text> → <Text style={styles.bold}>{nameOf(t.to)}</Text>
                  </Text>
                  <Text style={styles.transferAmount}>{arsFmt.format(t.amount)}</Text>
                </Pressable>
                {t.to === myMemberId ? (
                  <Pressable
                    style={({ pressed }) => [styles.remindBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => remindDebtor(t.from, t.to, t.amount)}
                    disabled={remind.isPending}
                  >
                    <Text style={styles.remindText}>Recordar</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Miembros */}
        <View style={styles.section}>
          <SectionLabel>Miembros ({members.length})</SectionLabel>
          <View style={styles.memberRow}>
            {members.map((m) => (
              <View key={m.id} style={styles.memberChip}>
                <Text style={styles.memberName}>{m.display_name}</Text>
                {m.status === "invited" ? <Text style={styles.pending}>pendiente</Text> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Historial */}
        <View style={styles.section}>
          <SectionLabel>Gastos ({expenses.length})</SectionLabel>
          {expenses.length === 0 ? (
            <Text style={styles.muted}>Todavía no hay gastos. Tocá “Agregar gasto”.</Text>
          ) : (
            expenses.map((e) => {
              const cat = categoryById(e.category);
              return (
                <Pressable
                  key={e.id}
                  style={({ pressed }) => [styles.expense, pressed && { opacity: 0.9 }]}
                  onLongPress={() => confirmDelete(e.description, () => delExpense.mutate({ groupId: g.id, expenseId: e.id }))}
                >
                  <IconChip icon="receipt-outline" tint={cat?.color ?? c.accent} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDesc}>{e.description}</Text>
                    <Text style={styles.expenseMeta}>
                      {nameOf(e.paid_by)} pagó · {e.date}
                    </Text>
                  </View>
                  <MoneyAmount ars={Number(e.amount_ars)} usd={e.amount_usd != null ? Number(e.amount_usd) : null} size="sm" />
                </Pressable>
              );
            })
          )}
          <Text style={styles.hintTiny}>Mantené presionado un gasto para borrarlo.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { padding: spacing.xl, gap: spacing.md, paddingBottom: 32 },
    actions: { flexDirection: "row", gap: spacing.sm },
    actionItem: { flex: 1 },
    section: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: spacing.sm,
      ...shadow.sm,
    },
    muted: { fontSize: 15, color: c.textDim },
    bold: { fontWeight: "800", color: c.text },
    transfer: {
      backgroundColor: c.surface2,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      gap: spacing.sm,
    },
    transferMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    transferText: { fontSize: 15, color: c.textDim, flex: 1 },
    transferAmount: { fontSize: 15, fontWeight: "800", color: c.warn, fontVariant: ["tabular-nums"] },
    remindBtn: {
      alignSelf: "flex-end",
      backgroundColor: c.accentSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    remindText: { fontSize: 13, color: c.accent, fontWeight: "700" },
    memberRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    memberChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.surface2,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: c.border,
    },
    memberName: { fontSize: 13, color: c.text, fontWeight: "600" },
    pending: { fontSize: 10, color: c.warn },
    expense: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    expenseDesc: { fontSize: 15, color: c.text, fontWeight: "600" },
    expenseMeta: { fontSize: 13, color: c.textDim, marginTop: 2 },
    hintTiny: { fontSize: 11, color: c.textDim, marginTop: spacing.xs },
  });
}
