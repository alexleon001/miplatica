// Invitar a alguien a un grupo. Modelo híbrido: si ponés su email, recibe un mail
// con el link (y al registrarse/loguearse con ese email queda vinculado). Si no,
// queda como participante "fantasma" y podés pasarle el link a mano.

import { useMemo, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FormField, FormInput, FormScreen, SubmitButton } from "../../components/form";
import { CtaButton } from "../../components/ui";
import { useInviteMember } from "../../lib/hooks/use-group-members";
import { useTheme } from "../../lib/theme-context";
import type { Palette } from "../../lib/theme-tokens";
import { spacing } from "../../lib/theme";

function inviteLink(groupId: string, token: string): string {
  return `miplatica://groups/${groupId}?token=${token}`;
}

export default function InviteMemberModal() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const invite = useInviteMember();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre a la persona que invitás.");
      return;
    }
    try {
      const member = await invite.mutateAsync({ groupId: groupId!, displayName: name, email: email.trim() || null });
      const url = inviteLink(groupId!, member.invite_token);
      setLink(url);
      if (email.trim()) {
        Alert.alert("Invitación enviada", `Le mandamos un mail a ${email.trim()} con el link para unirse.`);
      }
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "No pude invitar a la persona.");
    }
  }

  async function shareLink() {
    if (!link) return;
    try {
      await Share.share({ message: `Te invito a dividir gastos en Mi Platica: ${link}` });
    } catch {
      // cancelado
    }
  }

  return (
    <FormScreen title="Invitar al grupo">
      <FormField label="Nombre">
        <FormInput placeholder="Ana, Beto…" value={name} onChangeText={setName} autoFocus />
      </FormField>

      <FormField label="Email (opcional)" hint="Si lo ponés, le mandamos la invitación por mail.">
        <FormInput
          placeholder="ana@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FormField>

      {!link ? (
        <SubmitButton label={invite.isPending ? "Invitando…" : "Invitar"} onPress={submit} busy={invite.isPending} />
      ) : (
        <View style={styles.linkBox}>
          <Text style={styles.linkLabel}>Link de invitación</Text>
          <Text style={styles.link} numberOfLines={2}>{link}</Text>
          <CtaButton label="Compartir link" icon="share-outline" onPress={shareLink} />
          <CtaButton label="Listo" icon="checkmark" variant="outline" onPress={() => router.back()} />
        </View>
      )}
    </FormScreen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    linkBox: { gap: spacing.sm },
    linkLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: c.textDim },
    link: {
      fontSize: 15,
      color: c.accent,
      backgroundColor: c.surface,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
  });
}
