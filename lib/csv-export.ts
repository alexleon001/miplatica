// Serializa movimientos a CSV (para exportar/compartir → Excel/contador). Pura y
// testeable. Espejo inverso del parser de import (lib/csv.ts).

import { categoryById } from "./categories";

export type ExportableTx = {
  date: string;
  type: string;
  category: string | null;
  merchant: string | null;
  description: string | null;
  amount_ars: number | null;
  amount_usd: number | null;
};

const HEADERS = ["Fecha", "Tipo", "Categoría", "Comercio", "Descripción", "Monto ARS", "Monto USD"];

// Escapa un campo CSV: si tiene coma, comilla o salto de línea, lo encierra en
// comillas dobles y duplica las comillas internas (RFC 4180).
function esc(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const TYPE_LABEL: Record<string, string> = { income: "Ingreso", expense: "Gasto", transfer: "Transferencia" };

export function transactionsToCsv(rows: ExportableTx[]): string {
  const lines = [HEADERS.join(",")];
  for (const t of rows) {
    lines.push(
      [
        esc(t.date),
        esc(TYPE_LABEL[t.type] ?? t.type),
        esc(categoryById(t.category)?.label ?? t.category ?? ""),
        esc(t.merchant),
        esc(t.description),
        esc(t.amount_ars ?? ""),
        esc(t.amount_usd ?? ""),
      ].join(","),
    );
  }
  return lines.join("\n");
}
