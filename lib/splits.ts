// ============================================
// Lógica pura de gastos compartidos (split de gastos). Sin React ni red → testeable.
// ============================================
// Reparte un gasto entre miembros (equal/exact/shares/percent) con manejo exacto
// de centavos (la suma de las partes == total, sin pérdida por redondeo), calcula
// el balance neto por miembro y simplifica las deudas a la mínima cantidad de
// transferencias ("quién le paga cuánto a quién").
//
// Todos los montos se manejan en una sola moneda (la del grupo); internamente se
// trabaja en CENTAVOS enteros para garantizar invariantes exactas y se devuelve
// en unidades con 2 decimales.

export type SplitType = "equal" | "exact" | "shares" | "percent";

export type SplitShare = {
  member_id: string;
  // Lo que le toca pagar a este miembro de este gasto.
  amount: number;
  // Peso/porcentaje crudo con el que se calculó (para poder reeditar el gasto).
  share?: number;
};

export type BalanceInput = {
  // Miembros del grupo (define el universo; un miembro sin movimientos queda en 0).
  memberIds: string[];
  // Gastos: quién pagó y cuánto.
  expenses: { id: string; paidBy: string; amount: number }[];
  // Partes por gasto (lo que le toca a cada miembro).
  splits: { member_id: string; amount: number }[];
  // Pagos entre miembros ya saldados (from le pagó a to).
  settlements: { from: string; to: string; amount: number }[];
};

export type Balance = {
  member_id: string;
  // > 0: le deben (es acreedor). < 0: debe (es deudor). 0: a mano.
  net: number;
};

export type Transfer = { from: string; to: string; amount: number };

// ── helpers de centavos ───────────────────────────────────────────────────────
const toCents = (n: number): number => Math.round(n * 100);
const fromCents = (c: number): number => c / 100;

// ============================================
// Reparto de UN gasto
// ============================================

// Partes iguales. El residuo de centavos (cuando el total no divide exacto) se
// reparte de a 1 entre los primeros miembros → la suma cierra exacto.
export function splitEqual(total: number, memberIds: string[]): SplitShare[] {
  const n = memberIds.length;
  if (n === 0) return [];
  const cents = toCents(total);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  return memberIds.map((id, i) => ({
    member_id: id,
    amount: fromCents(base + (i < remainder ? 1 : 0)),
  }));
}

// Montos exactos por miembro (el usuario tipea cuánto pone cada uno). Se devuelven
// tal cual; la validación de que sumen el total se hace en la UI (validateSplits).
export function splitExact(amounts: Record<string, number>): SplitShare[] {
  return Object.entries(amounts).map(([member_id, amount]) => ({
    member_id,
    amount: fromCents(toCents(amount)),
    share: amount,
  }));
}

// Reparto proporcional a pesos (o a porcentajes — misma matemática). El residuo
// de centavos se asigna a los miembros con mayor parte fraccionaria → suma exacta.
export function splitByWeights(total: number, weights: Record<string, number>): SplitShare[] {
  const ids = Object.keys(weights);
  if (ids.length === 0) return [];
  const totalWeight = ids.reduce((s, id) => s + (weights[id] || 0), 0);
  if (totalWeight <= 0) {
    // Sin pesos válidos → caemos a partes iguales para no devolver ceros.
    return splitEqual(total, ids).map((s) => ({ ...s, share: weights[s.member_id] }));
  }
  const cents = toCents(total);
  const raw = ids.map((id) => {
    const exact = (cents * (weights[id] || 0)) / totalWeight;
    const floored = Math.floor(exact);
    return { id, floored, frac: exact - floored, share: weights[id] };
  });
  let remainder = cents - raw.reduce((s, r) => s + r.floored, 0);
  // Mayor parte fraccionaria primero; los empates por orden de aparición.
  const order = [...raw].sort((a, b) => b.frac - a.frac);
  const bonus = new Set<string>();
  for (const r of order) {
    if (remainder <= 0) break;
    bonus.add(r.id);
    remainder--;
  }
  return raw.map((r) => ({
    member_id: r.id,
    amount: fromCents(r.floored + (bonus.has(r.id) ? 1 : 0)),
    share: r.share,
  }));
}

// Atajo unificado: arma las partes según el tipo de split.
export function buildSplits(
  type: SplitType,
  total: number,
  opts: { memberIds?: string[]; amounts?: Record<string, number>; weights?: Record<string, number> },
): SplitShare[] {
  switch (type) {
    case "equal":
      return splitEqual(total, opts.memberIds ?? []);
    case "exact":
      return splitExact(opts.amounts ?? {});
    case "shares":
    case "percent":
      return splitByWeights(total, opts.weights ?? {});
  }
}

// True si las partes suman exactamente el total (tolerancia 1 centavo).
export function splitsMatchTotal(total: number, shares: SplitShare[]): boolean {
  const sum = shares.reduce((s, x) => s + toCents(x.amount), 0);
  return Math.abs(sum - toCents(total)) <= 1;
}

// ============================================
// Balance del grupo
// ============================================

// Neto por miembro: lo que pagó − lo que le tocaba + ajuste por pagos saldados.
// Invariante: la suma de todos los netos es 0 (lo testeamos).
export function computeBalances(input: BalanceInput): Balance[] {
  const net = new Map<string, number>(); // en centavos
  for (const id of input.memberIds) net.set(id, 0);
  const add = (id: string, c: number) => net.set(id, (net.get(id) ?? 0) + c);

  for (const e of input.expenses) add(e.paidBy, toCents(e.amount));
  for (const s of input.splits) add(s.member_id, -toCents(s.amount));
  // from le pagó a to: from reduce su deuda (+), to recibe lo que le debían (−).
  for (const t of input.settlements) {
    add(t.from, toCents(t.amount));
    add(t.to, -toCents(t.amount));
  }

  return [...net.entries()].map(([member_id, c]) => ({ member_id, net: fromCents(c) }));
}

// ============================================
// Simplificación de deudas (mínimas transferencias)
// ============================================

// Greedy: empareja al mayor deudor con el mayor acreedor hasta saldar todo. No es
// el óptimo teórico (problema NP-hard) pero da pocas transferencias y siempre cierra.
export function simplifyDebts(balances: Balance[]): Transfer[] {
  // Trabajamos en centavos para no arrastrar error de punto flotante.
  const creditors = balances
    .map((b) => ({ id: b.member_id, c: toCents(b.net) }))
    .filter((b) => b.c > 0)
    .sort((a, b) => b.c - a.c);
  const debtors = balances
    .map((b) => ({ id: b.member_id, c: -toCents(b.net) }))
    .filter((b) => b.c > 0)
    .sort((a, b) => b.c - a.c);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].c, creditors[j].c);
    if (pay > 0) {
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: fromCents(pay) });
    }
    debtors[i].c -= pay;
    creditors[j].c -= pay;
    if (debtors[i].c === 0) i++;
    if (creditors[j].c === 0) j++;
  }
  return transfers;
}

// ============================================
// Resumen para compartir (share sheet) — patrón de projection.ts:projectionToText
// ============================================
export function settlementText(
  groupName: string,
  transfers: Transfer[],
  nameOf: (memberId: string) => string,
  fmt: (amount: number) => string,
): string {
  const lines = [`💸 Saldos — ${groupName}`, ""];
  if (transfers.length === 0) {
    lines.push("¡Están a mano! No hay deudas pendientes.");
  } else {
    for (const t of transfers) {
      lines.push(`• ${nameOf(t.from)} → ${nameOf(t.to)}: ${fmt(t.amount)}`);
    }
  }
  lines.push("", "Generado con Mi Platica");
  return lines.join("\n");
}
