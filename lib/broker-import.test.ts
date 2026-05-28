import { expect, test } from "bun:test";
import { parseAmount, parseBrokerCsv, summarizeByType } from "./broker-import";

test("parseAmount soporta formato AR, US y plano", () => {
  expect(parseAmount("-150.000,50")).toBe(-150000.5);
  expect(parseAmount("1,234.56")).toBe(1234.56);
  expect(parseAmount("1234.5")).toBe(1234.5);
  expect(parseAmount("$ 2.000,00")).toBe(2000);
  expect(parseAmount("")).toBeNull();
});

test("parseBrokerCsv mapea, clasifica, deduplica y saltea basura", () => {
  const csv = [
    "Fecha;Tipo;Especie;Importe;Nro",
    "01/05/2026;Compra;AAPL;-150000,50;1001",
    "2026-05-02;Venta;GGAL;75300,00;1002",
    "03/05/2026;Dividendo;KO;1250,75;1003",
    "03/05/2026;Comisión;;-350,00;1004",
    "05/05/2026;Compra;AAPL;-150000,50;1001", // id duplicado
    "fila;;;;",
  ].join("\n");

  const r = parseBrokerCsv(csv);
  expect(r.movements.length).toBe(4);
  expect(r.duplicatesInFile).toBe(1);
  expect(r.skippedRows).toBe(1);
  expect(r.missingColumns).toEqual([]);

  const by = summarizeByType(r.movements);
  expect(by.income).toBe(1); // dividendo
  expect(by.expense).toBe(1); // comisión
  expect(by.investment).toBe(2); // compra + venta

  expect(r.movements[0].amountArs).toBe(150000.5); // siempre positivo

  const div = r.movements.find((m) => m.externalId === "1003");
  expect(div?.type).toBe("income");
  expect(div?.category).toBe("interest");
});

test("reporta columnas faltantes cuando no hay fecha/importe", () => {
  const r = parseBrokerCsv("col1;col2\na;b");
  expect(r.missingColumns.length).toBeGreaterThan(0);
});
