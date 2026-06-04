// ============================================
// Lógica pura de la proyección de pagos (cash-flow mensual).
// ============================================
// Genera la grilla mes×ítem a partir de ítems estructurados (recurrentes / en
// cuotas / únicos) + deudas, agrupados por medio de pago, y la compara contra
// el ingreso por mes para el neto (Deuda/Ganancia). Sin React, testeable.
//
// Convención de meses: claves "YYYY-MM-01" (día 1). Toda conversión a USD usa
// el MEP (regla #1: siempre ofrecer USD). Si no hay MEP, los montos USD son null.

export type Recurrence = "monthly" | "installments" | "once";

export type ProjItem = {
  id: string;
  name: string;
  paymentMethod: string;
  amount: number;
  currency: "ARS" | "USD";
  recurrence: Recurrence;
  startMonth: string; // "YYYY-MM-01"
  installmentsTotal: number | null;
  // TNA % anual. Si está seteado (en cuotas), `amount` es el CAPITAL a financiar
  // y la cuota mensual se calcula con sistema francés. Si es null/undefined,
  // `amount` se usa directo (monto por ocurrencia).
  interestRate?: number | null;
};

export type ProjLine = {
  id: string;
  name: string;
  amountArs: number;
  amountUsd: number | null;
  installmentLabel: string | null; // "3/6" si es cuota
};

export type ProjGroup = {
  paymentMethod: string;
  lines: ProjLine[];
  subtotalArs: number;
  subtotalUsd: number | null;
};

export type ProjMonth = {
  month: string; // "YYYY-MM-01"
  groups: ProjGroup[];
  totalArs: number;
  totalUsd: number | null;
  incomeArs: number;
  incomeUsd: number | null;
  netArs: number; // ingreso − total (negativo = déficit)
  netUsd: number | null;
  // Saldo acumulado proyectado: efectivo inicial + suma de los netos hasta este
  // mes inclusive. Negativo = te quedás sin plata ese mes.
  cumulativeArs: number;
  cumulativeUsd: number | null;
};

export type Projection = {
  months: ProjMonth[];
  startingBalanceArs: number;
  // Primer mes con saldo acumulado negativo ("YYYY-MM-01"), o null si nunca.
  firstDeficitMonth: string | null;
  // Cantidad de meses del período con déficit mensual (gastás más de lo que entra).
  deficitMonthCount: number;
};

export const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Normaliza cualquier fecha (ISO o Date) al día 1 de su mes: "YYYY-MM-01".
export function monthKey(input: string | Date): string {
  if (input instanceof Date) {
    const y = input.getUTCFullYear();
    const m = String(input.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }
  const m = /^(\d{4})-(\d{2})/.exec(input);
  if (!m) throw new Error(`Fecha inválida para monthKey: ${input}`);
  return `${m[1]}-${m[2]}-01`;
}

// Índice absoluto del mes (year*12 + month) para hacer diferencias.
function monthIndex(key: string): number {
  const m = /^(\d{4})-(\d{2})/.exec(key);
  if (!m) throw new Error(`monthKey inválido: ${key}`);
  return Number(m[1]) * 12 + (Number(m[2]) - 1);
}

// Meses de diferencia entre dos claves (b − a). Negativo si b es anterior a a.
export function monthsBetween(a: string, b: string): number {
  return monthIndex(b) - monthIndex(a);
}

export function addMonths(key: string, n: number): string {
  const idx = monthIndex(key) + n;
  const y = Math.floor(idx / 12);
  const m = String((idx % 12) + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthsWindow(start: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(addMonths(monthKey(start), i));
  return out;
}

export function monthLabel(key: string, withYear = true): string {
  const m = /^(\d{4})-(\d{2})/.exec(key);
  if (!m) return key;
  const name = MONTH_NAMES_ES[Number(m[2]) - 1] ?? key;
  return withYear ? `${name} ${m[1]}` : name;
}

// 0-based: en qué ocurrencia del ítem cae `month`, o null si el ítem no aplica.
export function occurrenceIndex(item: ProjItem, month: string): number | null {
  const diff = monthsBetween(monthKey(item.startMonth), monthKey(month));
  if (diff < 0) return null;
  switch (item.recurrence) {
    case "once":
      return diff === 0 ? 0 : null;
    case "monthly":
      return diff;
    case "installments": {
      const n = item.installmentsTotal ?? 0;
      return diff < n ? diff : null;
    }
  }
}

// Cuota fija (sistema francés) de un préstamo: capital amortizado en n cuotas
// a una tasa nominal anual (TNA %). Con tasa 0 → capital / n. Pura y testeable.
export function frenchPayment(principal: number, annualRatePct: number, n: number): number {
  if (n <= 0) return 0;
  const r = annualRatePct / 100 / 12; // tasa mensual
  if (r <= 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// Monto que aporta un ítem en CADA mes que aplica. Para cuotas con interés,
// `amount` es el capital y se devuelve la cuota fija (francés); en el resto,
// `amount` es el monto directo.
export function itemMonthlyAmount(item: ProjItem): number {
  if (
    item.recurrence === "installments" &&
    item.interestRate != null &&
    item.installmentsTotal != null &&
    item.installmentsTotal > 0
  ) {
    return frenchPayment(item.amount, item.interestRate, item.installmentsTotal);
  }
  return item.amount;
}

// Convierte un ítem (tabla debts) a ProjItem para inyectarlo a la proyección.
// Devuelve null si la deuda no tiene cuota mensual (no proyecta nada).
export function debtToProjItem(
  debt: {
    id: string;
    name: string;
    currency: string;
    remaining_amount: number | null;
    monthly_payment: number | null;
    next_payment_date: string | null;
  },
  today: string | Date,
): ProjItem | null {
  const monthly = debt.monthly_payment ?? 0;
  if (monthly <= 0) return null;
  const remaining = debt.remaining_amount ?? 0;
  const installments = remaining > 0 ? Math.ceil(remaining / monthly) : null;
  return {
    id: `debt:${debt.id}`,
    name: debt.name,
    paymentMethod: "Deudas",
    amount: monthly,
    currency: debt.currency === "USD" ? "USD" : "ARS",
    recurrence: installments != null ? "installments" : "monthly",
    startMonth: monthKey(debt.next_payment_date ?? today),
    installmentsTotal: installments,
  };
}

export type BuildProjectionArgs = {
  items: ProjItem[];        // ítems + deudas ya mergeadas (debtToProjItem)
  window: string[];         // claves de mes (monthsWindow)
  defaultIncomeArs: number; // profile.monthly_income_ars
  incomeOverrides: Record<string, number>; // monthKey -> amount_ars
  mep: number | null;       // ARS por USD
  // Efectivo de hoy (accounts_ars) para sembrar el saldo acumulado. Default 0.
  startingBalanceArs?: number;
  // Si `false`, el PRIMER mes de la ventana (el mes en curso) no suma su neto al
  // saldo acumulado: se trata como informativo y la proyección arranca a acumular
  // desde el mes siguiente. Evita el doble-conteo del mes en curso (el efectivo de
  // hoy ya refleja lo cobrado/pagado de este mes). Default `true` (acumula todo).
  accrueFirstMonth?: boolean;
};

export function buildProjection(args: BuildProjectionArgs): Projection {
  const { items, window, defaultIncomeArs, incomeOverrides, mep } = args;
  const startingBalanceArs = args.startingBalanceArs ?? 0;
  const accrueFirstMonth = args.accrueFirstMonth ?? true;
  const hasMep = mep != null && mep > 0;

  const arsOf = (amt: number, cur: "ARS" | "USD") =>
    cur === "ARS" ? amt : hasMep ? amt * mep! : 0;
  const usdOf = (amt: number, cur: "ARS" | "USD"): number | null =>
    cur === "USD" ? amt : hasMep ? amt / mep! : null;

  let runningArs = startingBalanceArs;
  let firstDeficitMonth: string | null = null;
  let deficitMonthCount = 0;

  const months: ProjMonth[] = window.map((month, monthIdx) => {
    // Agrupar por medio de pago, preservando orden de aparición.
    const groupOrder: string[] = [];
    const groupMap = new Map<string, ProjGroup>();

    for (const item of items) {
      const idx = occurrenceIndex(item, month);
      if (idx == null) continue;

      const monthly = itemMonthlyAmount(item);
      const amountArs = arsOf(monthly, item.currency);
      const amountUsd = usdOf(monthly, item.currency);
      const installmentLabel =
        item.recurrence === "installments" && item.installmentsTotal
          ? `${idx + 1}/${item.installmentsTotal}`
          : null;

      let g = groupMap.get(item.paymentMethod);
      if (!g) {
        g = { paymentMethod: item.paymentMethod, lines: [], subtotalArs: 0, subtotalUsd: hasMep ? 0 : null };
        groupMap.set(item.paymentMethod, g);
        groupOrder.push(item.paymentMethod);
      }
      g.lines.push({ id: item.id, name: item.name, amountArs, amountUsd, installmentLabel });
      g.subtotalArs += amountArs;
      if (hasMep && g.subtotalUsd != null && amountUsd != null) g.subtotalUsd += amountUsd;
    }

    const groups = groupOrder.map((k) => groupMap.get(k)!);
    const totalArs = groups.reduce((s, g) => s + g.subtotalArs, 0);
    const totalUsd = hasMep ? groups.reduce((s, g) => s + (g.subtotalUsd ?? 0), 0) : null;

    const incomeArs = incomeOverrides[month] ?? defaultIncomeArs;
    const incomeUsd = hasMep ? incomeArs / mep! : null;
    const netArs = incomeArs - totalArs;
    const netUsd = hasMep ? incomeArs / mep! - (totalUsd ?? 0) : null;

    if (netArs < 0) deficitMonthCount += 1;

    // El mes en curso (idx 0) no acumula su neto si accrueFirstMonth=false:
    // el saldo de ese mes queda en el efectivo de hoy (informativo) y la
    // acumulación real arranca el mes siguiente.
    if (monthIdx > 0 || accrueFirstMonth) runningArs += netArs;
    const cumulativeArs = runningArs;
    const cumulativeUsd = hasMep ? cumulativeArs / mep! : null;
    if (cumulativeArs < 0 && firstDeficitMonth == null) firstDeficitMonth = month;

    return { month, groups, totalArs, totalUsd, incomeArs, incomeUsd, netArs, netUsd, cumulativeArs, cumulativeUsd };
  });

  return { months, startingBalanceArs, firstDeficitMonth, deficitMonthCount };
}
