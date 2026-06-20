// Detalle de un grupo: balances simplificados ("quién le debe a quién"), acciones
// (agregar gasto / saldar / invitar / compartir) e historial de gastos.

import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Card, CtaButton, IconChip, SectionLabel } from "../../components/ui";
import { MoneyAmount } from "../../components/MoneyAmount";
import { useAuth } from "../../lib/auth";
import { categoryById } from "../../lib/categories";
import { confirmDelete } from "../../lib/confirm";
import { useGroup } from "../../lib/hooks/use-group";
import { useRemindDebtor } from "../../lib/hooks/use-group-members";
import { useDeleteSharedExpense } from "../../lib/hooks/use-shared-expenses";
import { settlementText } from "../../lib/splits";
import { colors, radius, spacing, typography, shadow } from "../../lib/theme";

const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function GroupDetailScreen() {
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
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
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
        {/* Acciones */}
        <View style={styles.actions}>
          <CtaButton label="Agregar gasto" icon="add-circle-outline" onPress={() => router.push(`/modals/add-shared-expense?groupId=${g.id}`)} />
          <CtaButton label="Saldar" icon="checkmark-done-outline" variant="outline" onPress={() => router.push(`/modals/settle-up?groupId=${g.id}`)} />
        </View>
        <View style={styles.actions}>
          <CtaButton label="Invitar" icon="person-add-outline" variant="outline" onPress={() => router.push(`/modals/invite-member?groupId=${g.id}`)} />
          <CtaButton label="Compartir" icon="share-outline" variant="outline" onPress={share} />
        </View>

        {/* Balances simplificados */}
        <View style={styles.section}>
          <SectionLabel>Quién le debe a quién</SectionLabel>
          {transfers.length === 0 ? (
            <Card><Text style={styles.muted}>¡Están a mano! No hay deudas pendientes.</Text></Card>
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
            <Card><Text style={styles.muted}>Todavía no hay gastos. Tocá “Agregar gasto”.</Text></Card>
          ) : (
            expenses.map((e) => {
              const cat = categoryById(e.category);
              return (
                <Pressable
                  key={e.id}
                  style={({ pressed }) => [styles.expense, pressed && { opacity: 0.9 }]}
                  onLongPress={() => confirmDelete(e.description, () => delExpense.mutate({ groupId: g.id, expenseId: e.id }))}
                >
                  <IconChip icon="receipt-outline" tint={cat?.color ?? colors.accent} size={38} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: 32 },
  actions: { flexDirection: "row", gap: spacing.md },
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow.sm,
  },
  muted: { ...typography.body, color: colors.textMuted },
  bold: { fontWeight: "800", color: colors.textPrimary },
  transfer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  transferMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  transferText: { ...typography.body, color: colors.textMuted, flex: 1 },
  transferAmount: { ...typography.body, fontWeight: "800", color: colors.warning },
  remindBtn: {
    alignSelf: "flex-end",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  remindText: { ...typography.caption, color: colors.primaryBright, fontWeight: "700" },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberName: { ...typography.caption, color: colors.textPrimary, fontWeight: "600" },
  pending: { ...typography.caption, color: colors.warning, fontSize: 10 },
  expense: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  expenseDesc: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  expenseMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  hintTiny: { ...typography.caption, color: colors.textMuted, fontSize: 11, marginTop: spacing.xs },
});
