// ============================================
// FCI (Fondos Comunes de Inversión) — helpers puros.
// ============================================
// Los FCI no tienen ticker de mercado (el sistema de precios matchea por
// `ticker`), así que usamos un slug determinístico del nombre del fondo como
// "ticker". La cotización es el VCP (valor de la cuotaparte) que publica
// argentinadatos por categoría. Sin React, testeable.

export type FciCategory = "mercadoDinero" | "rentaFija" | "rentaVariable" | "rentaMixta";

export const FCI_CATEGORIES: { id: FciCategory; label: string }[] = [
  { id: "mercadoDinero", label: "Mercado de dinero" },
  { id: "rentaFija", label: "Renta fija" },
  { id: "rentaVariable", label: "Renta variable" },
  { id: "rentaMixta", label: "Renta mixta" },
];

const CATEGORY_LABELS: Record<FciCategory, string> = Object.fromEntries(
  FCI_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<FciCategory, string>;

export function fciCategoryLabel(c: FciCategory): string {
  return CATEGORY_LABELS[c] ?? c;
}

export type FciFund = {
  slug: string;       // "ticker" determinístico (ALPHA-PESOS-CLASE-A)
  fondo: string;      // nombre publicado ("Alpha Pesos - Clase A")
  vcp: number;        // valor de la cuotaparte (ARS)
  fecha: string;      // "YYYY-MM-DD" del último dato
  category: FciCategory;
};

// Quita acentos (marcas diacríticas combinantes U+0300–U+036F).
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Slug estable a partir del nombre del fondo: sin acentos, mayúsculas, separadores
// colapsados a "-". El mismo nombre siempre da el mismo slug (lado cliente).
export function fciSlug(fondo: string): string {
  return stripAccents(fondo)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Filtra fondos por texto libre (case/acento-insensitive) sobre el nombre.
export function filterFunds(funds: FciFund[], query: string): FciFund[] {
  const q = stripAccents(query).toLowerCase().trim();
  if (!q) return funds;
  return funds.filter((f) => stripAccents(f.fondo).toLowerCase().includes(q));
}

// Normaliza una fila cruda de argentinadatos a FciFund (o null si inválida).
export function parseFciRow(row: unknown, category: FciCategory): FciFund | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const fondo = typeof r.fondo === "string" ? r.fondo.trim() : "";
  const vcp = Number(r.vcp);
  if (!fondo || !Number.isFinite(vcp) || vcp <= 0) return null;
  return {
    slug: fciSlug(fondo),
    fondo,
    vcp,
    fecha: typeof r.fecha === "string" ? r.fecha : "",
    category,
  };
}
