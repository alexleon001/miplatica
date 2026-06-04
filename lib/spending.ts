// Lógica pura del desglose de gastos por categoría (dónde se te va la plata).
// Sin React → unit-testeable con `bun test`.

export type SpendingRow = {
  type: string;
  category: string | null;
  amount_ars: number | null;
  amount_usd: number | null;
  date: string; // "YYYY-MM-DD"
};

export type CategorySpend = {
  category: string; // id de lib/categories (o "other" si viene null)
  ars: number;
  usd: number | null;
  pct: number; // % del gasto total del período (sobre ARS)
};

export type SpendingBreakdown = {
  items: CategorySpend[]; // ordenadas de mayor a menor gasto
  totalArs: number;
  totalUsd: number | null;
};

// Agrupa los gastos (type === "expense") del período dado por categoría.
// `period` = "YYYY-MM". Suma ARS y USD; el USD del grupo es null si a alguna
// fila le falta el dato (no inventamos conversión acá).
export function spendingByCategory(rows: SpendingRow[], period: string): SpendingBreakdown {
  const byCat = new Map<string, { ars: number; usd: number | null }>();
  let totalArs = 0;
  let totalUsd: number | null = 0;

  for (const r of rows) {
    if (r.type !== "expense") continue;
    if ((r.date ?? "").slice(0, 7) !== period) continue;
    const cat = r.category ?? "other";
    const ars = Number(r.amount_ars ?? 0);
    const usd = r.amount_usd != null ? Number(r.amount_usd) : null;

    const acc = byCat.get(cat) ?? { ars: 0, usd: 0 as number | null };
    acc.ars += ars;
    if (acc.usd != null && usd != null) acc.usd += usd;
    else acc.usd = null;
    byCat.set(cat, acc);

    totalArs += ars;
    if (totalUsd != null && usd != null) totalUsd += usd;
    else totalUsd = null;
  }

  const items: CategorySpend[] = [...byCat.entries()]
    .map(([category, v]) => ({
      category,
      ars: v.ars,
      usd: v.usd,
      pct: totalArs > 0 ? (v.ars / totalArs) * 100 : 0,
    }))
    .sort((a, b) => b.ars - a.ars);

  return { items, totalArs, totalUsd };
}

// Recorta a las `top` categorías y agrupa el resto en una fila "other".
// Útil para no saturar la UI cuando hay muchas categorías.
export function topCategories(breakdown: SpendingBreakdown, top = 6): CategorySpend[] {
  if (breakdown.items.length <= top) return breakdown.items;
  const head = breakdown.items.slice(0, top);
  const tail = breakdown.items.slice(top);
  const rest: CategorySpend = {
    category: "other",
    ars: tail.reduce((s, x) => s + x.ars, 0),
    usd: tail.every((x) => x.usd != null) ? tail.reduce((s, x) => s + (x.usd ?? 0), 0) : null,
    pct: tail.reduce((s, x) => s + x.pct, 0),
  };
  // Si ya existe "other" en head, sumamos ahí en vez de duplicar la fila.
  const existing = head.find((x) => x.category === "other");
  if (existing) {
    existing.ars += rest.ars;
    existing.pct += rest.pct;
    existing.usd = existing.usd != null && rest.usd != null ? existing.usd + rest.usd : null;
    return head;
  }
  return [...head, rest];
}
