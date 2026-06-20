// Gestión de miembros de un grupo: invitar (crea fantasma + manda mail),
// quitar, salir, y reclamar invitaciones al loguearse (vincula fantasmas por email).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gdb, type GroupMember } from "../groups-types";
import { supabase } from "../supabase";

export type InviteMemberInput = { groupId: string; displayName: string; email?: string | null };

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, displayName, email }: InviteMemberInput) => {
      const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;
      const { data, error } = await gdb
        .from("group_members")
        .insert({
          group_id: groupId,
          display_name: displayName.trim(),
          email: cleanEmail,
          role: "member",
          status: "invited",
        })
        .select()
        .single();
      if (error) throw error;
      const member = data as GroupMember;

      // Best-effort: si hay email, disparamos el mail de invitación. Si la edge no
      // está deployada todavía, no rompemos el alta del miembro.
      if (cleanEmail) {
        try {
          await supabase.functions.invoke("group-invite", { body: { member_id: member.id } });
        } catch (e) {
          console.warn("[useInviteMember] no se pudo enviar el mail:", e);
        }
      }
      return member;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["groups", "detail", vars.groupId] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId }: { groupId: string; memberId: string }) => {
      const { error } = await gdb.from("group_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["groups", "detail", vars.groupId] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId }: { groupId: string; memberId: string }) => {
      const { error } = await gdb.from("group_members").update({ status: "left" }).eq("id", memberId);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

// Recordatorio ad-hoc por mail al deudor (botón "Recordar"). Best-effort.
export function useRemindDebtor() {
  return useMutation({
    mutationFn: async ({ debtorId, creditorId, amount }: { debtorId: string; creditorId: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke("group-reminder", {
        body: { debtor_id: debtorId, creditor_id: creditorId, amount },
      });
      if (error) throw error;
      return data as { sent: boolean };
    },
  });
}

// Vincula los miembros fantasma cuyo email coincide con el del usuario logueado.
// Se llama tras el login (cubre usuarios que ya existían antes de ser invitados).
export async function claimGroupInvites(): Promise<number> {
  const { data, error } = await gdb.rpc("claim_group_invites");
  if (error) {
    console.warn("[claimGroupInvites]", error);
    return 0;
  }
  return Number(data) || 0;
}
