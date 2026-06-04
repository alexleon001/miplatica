import { expect, test } from "bun:test";
import { fciSlug, filterFunds, parseFciRow, type FciFund } from "./fci";

test("fciSlug: determinístico, sin acentos, separadores colapsados", () => {
  expect(fciSlug("Alpha Pesos - Clase A")).toBe("ALPHA-PESOS-CLASE-A");
  expect(fciSlug("Galicia Renta Fija $")).toBe("GALICIA-RENTA-FIJA");
  expect(fciSlug("  Schroder Acciones  ")).toBe("SCHRODER-ACCIONES");
  // mismo nombre → mismo slug (idempotente)
  expect(fciSlug("Fondo Ñandú")).toBe(fciSlug("Fondo Ñandú"));
});

test("parseFciRow: valida fondo + vcp, descarta basura", () => {
  expect(parseFciRow({ fondo: "Alpha Pesos", vcp: 98297.825, fecha: "2026-06-01" }, "mercadoDinero")).toEqual({
    slug: "ALPHA-PESOS",
    fondo: "Alpha Pesos",
    vcp: 98297.825,
    fecha: "2026-06-01",
    category: "mercadoDinero",
  });
  expect(parseFciRow({ fondo: "X", vcp: 0 }, "rentaFija")).toBeNull();
  expect(parseFciRow({ fondo: "", vcp: 100 }, "rentaFija")).toBeNull();
  expect(parseFciRow(null, "rentaFija")).toBeNull();
});

test("filterFunds: case/acento-insensitive sobre el nombre", () => {
  const funds: FciFund[] = [
    { slug: "A", fondo: "Alpha Pesos", vcp: 1, fecha: "", category: "mercadoDinero" },
    { slug: "B", fondo: "Schröder Renta", vcp: 2, fecha: "", category: "rentaFija" },
  ];
  expect(filterFunds(funds, "alpha").map((f) => f.slug)).toEqual(["A"]);
  expect(filterFunds(funds, "SCHRODER").map((f) => f.slug)).toEqual(["B"]); // sin acento matchea
  expect(filterFunds(funds, "")).toHaveLength(2);
  expect(filterFunds(funds, "zzz")).toHaveLength(0);
});
