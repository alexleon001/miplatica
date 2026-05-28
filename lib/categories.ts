// Diccionario central de categorías de transacciones.
// Único punto de verdad para label/icon/color/group → consumido por modal
// add-transaction, lista, presupuestos. El campo `transactions.category`
// almacena el `id` (key) de este diccionario.

import { colors } from "./colors";

export type CategoryGroup = "expense" | "income" | "transfer" | "investment";

export type Category = {
  id: string;
  label: string;
  icon: string;       // emoji (simple, sin deps)
  color: string;      // hex
  group: CategoryGroup;
};

export const CATEGORIES: readonly Category[] = [
  // ── EXPENSE ───────────────────────────────────────────────────────────
  { id: "food",          label: "Comida",         icon: "🍽️", color: "#F97316", group: "expense" },
  { id: "supermarket",   label: "Supermercado",   icon: "🛒", color: "#84CC16", group: "expense" },
  { id: "restaurants",   label: "Restaurantes",   icon: "🍔", color: "#EF4444", group: "expense" },
  { id: "transport",     label: "Transporte",     icon: "🚇", color: "#3B82F6", group: "expense" },
  { id: "entertainment", label: "Entretenimiento",icon: "🎬", color: "#A855F7", group: "expense" },
  { id: "utilities",     label: "Servicios",      icon: "💡", color: "#06B6D4", group: "expense" },
  { id: "health",        label: "Salud",          icon: "🩺", color: "#10B981", group: "expense" },
  { id: "education",     label: "Educación",      icon: "📚", color: "#6366F1", group: "expense" },
  { id: "clothing",      label: "Ropa",           icon: "👕", color: "#EC4899", group: "expense" },
  { id: "tech",          label: "Tecnología",     icon: "💻", color: "#64748B", group: "expense" },
  { id: "travel",        label: "Viajes",         icon: "✈️", color: "#0EA5E9", group: "expense" },
  { id: "rent",          label: "Alquiler",       icon: "🏠", color: "#F59E0B", group: "expense" },
  { id: "other",         label: "Otros",          icon: "📦", color: "#94A3B8", group: "expense" },

  // ── INCOME ────────────────────────────────────────────────────────────
  { id: "salary",        label: "Sueldo",         icon: "💼", color: "#22C55E", group: "income"  },
  { id: "freelance",     label: "Freelance",      icon: "💸", color: "#10B981", group: "income"  },
  { id: "interest",      label: "Intereses",      icon: "📈", color: "#22C55E", group: "income"  },
  { id: "other_income",  label: "Otros ingresos", icon: "🎁", color: "#22C55E", group: "income"  },

  // ── TRANSFER / INVESTMENT (no son income ni expense estrictos) ──────
  { id: "transfers",     label: "Transferencia",  icon: "🔄", color: colors.primary, group: "transfer"   },
  { id: "investment",    label: "Inversión",      icon: "💎", color: "#A855F7",      group: "investment" },
] as const;

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryById(id: string | null | undefined): Category | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function categoriesByGroup(group: CategoryGroup): Category[] {
  return CATEGORIES.filter((c) => c.group === group);
}

// Lista de IDs válidos para mandar al prompt de IA (evita que el modelo
// invente categorías nuevas que después no podemos renderear).
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
