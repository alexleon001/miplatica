// Parser CSV mínimo (RFC4180-ish) sin dependencias — pensado para correr en
// React Native / Expo Go sin sumar módulos nativos.
//
// - Auto-detecta el delimitador (coma o punto y coma) desde la primera línea.
//   Los exports de brokers/bancos argentinos suelen usar `;` (porque la coma
//   es separador decimal).
// - Soporta campos entre comillas con delimitadores/saltos de línea internos
//   y comillas escapadas ("").
// - Tolera BOM y CRLF.

export type Delimiter = "," | ";";

export function detectDelimiter(headerLine: string): Delimiter {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

export function parseCsv(text: string, delimiter?: Delimiter): string[][] {
  const clean = text.replace(/^﻿/, ""); // strip BOM
  const nl = clean.indexOf("\n");
  const firstLine = nl === -1 ? clean : clean.slice(0, nl);
  const delim = delimiter ?? detectDelimiter(firstLine);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  // Último campo / fila (si el archivo no termina en salto de línea).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Descarta filas completamente vacías.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
