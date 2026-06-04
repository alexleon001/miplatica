import { describe, expect, it } from "bun:test";
import { transactionsToCsv, type ExportableTx } from "./csv-export";

const tx = (over: Partial<ExportableTx>): ExportableTx => ({
  date: "2026-06-10",
  type: "expense",
  category: "food",
  merchant: "Carrefour",
  description: null,
  amount_ars: 12345,
  amount_usd: 12.5,
  ...over,
});

describe("transactionsToCsv", () => {
  it("incluye encabezado y traduce tipo + categoría", () => {
    const csv = transactionsToCsv([tx({})]);
    const [head, row] = csv.split("\n");
    expect(head).toBe("Fecha,Tipo,Categoría,Comercio,Descripción,Monto ARS,Monto USD");
    expect(row).toBe("2026-06-10,Gasto,Comida,Carrefour,,12345,12.5");
  });

  it("escapa comas, comillas y saltos de línea", () => {
    const csv = transactionsToCsv([tx({ description: 'pago, con "comillas"', merchant: "a\nb" })]);
    const row = csv.split("\n").slice(1).join("\n");
    expect(row).toContain('"pago, con ""comillas"""');
    expect(row).toContain('"a\nb"');
  });

  it("maneja montos null", () => {
    const csv = transactionsToCsv([tx({ amount_usd: null })]);
    expect(csv.split("\n")[1].endsWith(",")).toBe(true);
  });
});
