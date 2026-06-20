// Tipos de las tablas de gastos compartidos (migración 0015) + accesor de cliente.
//
// database.types.ts se regenera (MCP) recién DESPUÉS de aplicar 0015 al proyecto,
// así que hasta entonces el cliente tipado no conoce estas tablas. Para que el
// type-check pase ya, definimos los Row types a mano acá y exponemos `gdb`: el
// mismo cliente de Supabase pero sin tipar las tablas nuevas. Concentrar el cast
// en un solo lugar evita esparcir `as any` por todos los hooks.

import { supabase } from "./supabase";

export type GroupKind = "trip" | "household" | "outing" | "other";
export type GroupCurrency = "ARS" | "USD";
export type SplitType = "equal" | "exact" | "shares" | "percent";
export type MemberRole = "owner" | "member";
export type MemberStatus = "active" | "invited" | "left";

export type ExpenseGroup = {
  id: string;
  created_by: string;
  name: string;
  kind: GroupKind;
  default_currency: GroupCurrency;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  role: MemberRole;
  status: MemberStatus;
  invite_token: string;
  last_reminded_at: string | null;
  joined_at: string | null;
  created_at: string;
};

export type SharedExpense = {
  id: string;
  group_id: string;
  paid_by: string;
  amount_ars: number;
  amount_usd: number | null;
  currency: GroupCurrency;
  usd_rate_used: number | null;
  description: string;
  category: string | null;
  date: string;
  split_type: SplitType;
  created_by: string;
  created_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  member_id: string;
  amount_ars: number;
  share: number | null;
};

export type Settlement = {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount_ars: number;
  currency: GroupCurrency;
  date: string;
  note: string | null;
  recorded_transaction_id: string | null;
  created_by: string;
  created_at: string;
};

// Cliente sin tipar para las tablas nuevas (ver nota arriba).
// eslint-disable-next-line ts/no-explicit-any
export const gdb = supabase as any;
