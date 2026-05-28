// Mapea un CSV de movimientos de broker/banco (Cocos, PPI, IOL, etc.) a
// movimientos normalizados listos para insertar en `transactions`.
//
// Estrategia: detección de columnas por alias (es-AR, sin acentos), parseo
// tolerante de fecha y monto, e inferencia de tipo por palabras clave. La
// deduplicación (regla #4 del proyecto) se apoya en `external_id`: si el CSV
// trae nro de operación se usa ese; si no, se sintetiza uno determinístico a
// partir de (fecha|descripción|monto) para que reimportar el mismo archivo no
// duplique. El upsert final usa la constraint (owner_id, source, external_id).

import { parseCsv } from "./csv";

export type MovementType = "income" | "expense" | "transfer" | "investment";

export type ParsedMovement = {
  date: string; // ISO yyyy-mm-dd
  type: MovementType;
  category: string | null;
  description: string | null;
  amountArs: number; // siempre positivo; el signo lo da `type` en la UI
  externalId: string;
};

export type ParseResult = {
  movements: ParsedMovement[];
  skippedRows: number; // filas de datos que no se pudieron mapear (sin fecha/monto)
  duplicatesInFile: number; // colisiones de external_id dentro del mismo archivo
  missingColumns: string[]; // columnas requeridas no detectadas
};

// ── Alias de columnas (se comparan normalizados: minúsculas, sin acentos) ──
const ALIASES: Record<string, string[]> = {
  date: [
    "fecha", "date", "fecha concertacion", "fecha de concertacion",
    "fecha liquidacion", "fecha operacion", "fecha movimiento",
  ],
  type: [
    "tipo", "operacion", "movimiento", "concepto", "tipo movimiento",
    "tipo de operacion", "detalle",
  ],
  description: [
    "descripcion", "detalle", "especie", "ticker", "instrumento",
    "concepto", "denominacion", "simbolo",
  ],
  amount: [
    "importe", "monto", "total", "neto", "importe neto", "monto total",
    "monto neto", "importe ars", "bruto", "importe total",
  ],
  id: [
    "numero", "nro", "nro operacion", "numero operacion", "numero de operacion",
    "id", "comprobante", "boleto", "order id", "operacion id", "id operacion",
  ],
};

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function findCol(header: string[], aliases: string[]): number {
  const normed = header.map(norm);
  // 1) match exacto
  for (const a of aliases) {
    const idx = normed.indexOf(norm(a));
    if (idx !== -1) return idx;
  }
  // 2) match parcial (la celda contiene el alias)
  for (let i = 0; i < normed.length; i++) {
    if (aliases.some((a) => normed[i].includes(norm(a)))) return i;
  }
  return -1;
}

function parseDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// Parsea montos en formato AR ("1.234,56"), US ("1,234.56") o plano ("1234.56").
export function parseAmount(s: string): number | null {
  let t = s.trim().replace(/[^0-9.,\-]/g, "");
  if (!t) return null;
  const neg = t.startsWith("-");
  t = t.replace(/-/g, "");

  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = t.replace(/\./g, "").replace(",", "."); // coma decimal
  } else if (lastDot > lastComma) {
    normalized = t.replace(/,/g, ""); // punto decimal
  } else {
    normalized = t;
  }

  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

// Infiere tipo + categoría a partir del texto del movimiento.
function classify(token: string): { type: MovementType; category: string | null } {
  const t = norm(token);
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has("dividendo", "renta", "cupon", "interes", "amortizacion")) {
    return { type: "income", category: "interest" };
  }
  if (has("deposito", "acredit", "ingreso", "transferencia recibida")) {
    return { type: "income", category: "other_income" };
  }
  if (has("comision", "arancel", "impuesto", "iva", "derecho", "fee", "gasto", "retencion")) {
    return { type: "expense", category: "other" };
  }
  if (has("retiro", "extrac", "egreso", "transferencia enviada")) {
    return { type: "expense", category: "other" };
  }
  // compra/venta/suscripción/rescate y default → inversión (neutral al balance mensual)
  return { type: "investment", category: "investment" };
}

export function parseBrokerCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { movements: [], skippedRows: 0, duplicatesInFile: 0, missingColumns: ["fecha", "monto"] };
  }

  const header = rows[0];
  const cols = {
    date: findCol(header, ALIASES.date),
    type: findCol(header, ALIASES.type),
    description: findCol(header, ALIASES.description),
    amount: findCol(header, ALIASES.amount),
    id: findCol(header, ALIASES.id),
  };

  const missingColumns: string[] = [];
  if (cols.date === -1) missingColumns.push("fecha");
  if (cols.amount === -1) missingColumns.push("monto/importe");
  if (missingColumns.length > 0) {
    return { movements: [], skippedRows: 0, duplicatesInFile: 0, missingColumns };
  }

  const movements: ParsedMovement[] = [];
  const seen = new Set<string>();
  let skippedRows = 0;
  let duplicatesInFile = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const date = parseDate(cells[cols.date] ?? "");
    const amount = parseAmount(cells[cols.amount] ?? "");
    if (!date || amount == null || amount === 0) {
      skippedRows++;
      continue;
    }

    const typeToken = cols.type !== -1 ? cells[cols.type] ?? "" : "";
    const descToken = cols.description !== -1 ? cells[cols.description] ?? "" : "";
    const { type, category } = classify(`${typeToken} ${descToken}`);
    const description = (descToken || typeToken).trim() || null;

    const rawId = cols.id !== -1 ? (cells[cols.id] ?? "").trim() : "";
    const externalId = rawId || `${date}|${description ?? ""}|${amount}`;

    if (seen.has(externalId)) {
      duplicatesInFile++;
      continue;
    }
    seen.add(externalId);

    movements.push({
      date,
      type,
      category,
      description,
      amountArs: Math.abs(amount),
      externalId,
    });
  }

  return { movements, skippedRows, duplicatesInFile, missingColumns: [] };
}

// Resumen por tipo para el preview del modal.
export function summarizeByType(movements: ParsedMovement[]): Record<MovementType, number> {
  const acc: Record<MovementType, number> = { income: 0, expense: 0, transfer: 0, investment: 0 };
  for (const m of movements) acc[m.type]++;
  return acc;
}
