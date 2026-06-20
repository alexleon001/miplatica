// Detalle de un grupo: miembros + gastos + splits + settlements, con los balances
// y las transferencias mínimas derivadas (lib/splits, lógica pura testeada).

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type ExpenseGroup,
  type ExpenseSplit,
  gdb,
  type GroupMember,
  type Settlement,
  type SharedExpense,
} from "../groups-types";
import { type Balance, computeBalances, simplifyDebts, type Transfer } from "../splits";

export type GroupDetail = {
  group: ExpenseGroup;
  members: GroupMember[];
  expenses: SharedExpense[];
  splits: ExpenseSplit[];
  settlements: Settlement[];
};

async function fetchGroupDetail(id: string): Promise<GroupDetail> {
  const [groupRes, membersRes, expensesRes, settlementsRes] = await Promise.all([
    gdb.from("expense_groups").select("*").eq("id", id).single(),
    gdb.from("group_members").select("*").eq("group_id", id).order("created_at", { ascending: true }),
    gdb.from("shared_expenses").select("*").eq("group_id", id).order("date", { ascending: false }),
    gdb.from("settlements").select("*").eq("group_id", id).order("date", { ascending: false }),
  ]);
  for (const r of [groupRes, membersRes, expensesRes, settlementsRes]) {
    if (r.error) throw r.error;
  }
  const expenses = (expensesRes.data ?? []) as SharedExpense[];

  let splits: ExpenseSplit[] = [];
  if (expenses.length > 0) {
    const { data, error } = await gdb
      .from("expense_splits")
      .select("*")
      .in("expense_id", expenses.map((e) => e.id));
    if (error) throw error;
    splits = (data ?? []) as ExpenseSplit[];
  }

  return {
    group: groupRes.data as ExpenseGroup,
    members: (membersRes.data ?? []) as GroupMember[],
    expenses,
    settlements: (settlementsRes.data ?? []) as Settlement[],
    splits,
  };
}

export function useGroup(id: string | undefined) {
  const query = useQuery({
    queryKey: ["groups", "detail", id],
    queryFn: () => fetchGroupDetail(id!),
    enabled: !!id,
  });

  const derived = useMemo(() => {
    const d = query.data;
    if (!d) return { balances: [] as Balance[], transfers: [] as Transfer[] };
    // Los miembros que "salieron" no participan del cálculo en vivo.
    const memberIds = d.members.filter((m) => m.status !== "left").map((m) => m.id);
    const balances = computeBalances({
      memberIds,
      expenses: d.expenses.map((e) => ({ id: e.id, paidBy: e.paid_by, amount: Number(e.amount_ars) })),
      splits: d.splits.map((s) => ({ member_id: s.member_id, amount: Number(s.amount_ars) })),
      settlements: d.settlements.map((s) => ({ from: s.from_member, to: s.to_member, amount: Number(s.amount_ars) })),
    });
    return { balances, transfers: simplifyDebts(balances) };
  }, [query.data]);

  return { ...query, ...derived };
}
