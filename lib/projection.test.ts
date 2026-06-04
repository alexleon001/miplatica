import { expect, test } from "bun:test";
import {
  addMonths,
  buildProjection,
  debtToProjItem,
  frenchPayment,
  monthKey,
  monthLabel,
  monthsBetween,
  monthsWindow,
  occurrenceIndex,
  projectionToText,
  type ProjItem,
} from "./projection";

test("monthKey normaliza al día 1 del mes", () => {
  expect(monthKey("2026-06-15")).toBe("2026-06-01");
  expect(monthKey("2026-12-31T23:00:00Z")).toBe("2026-12-01");
  expect(monthKey(new Date(Date.UTC(2026, 5, 20)))).toBe("2026-06-01");
});

test("addMonths cruza año correctamente", () => {
  expect(addMonths("2026-11-01", 2)).toBe("2027-01-01");
  expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
});

test("monthsBetween y monthsWindow", () => {
  expect(monthsBetween("2026-06-01", "2026-09-01")).toBe(3);
  expect(monthsBetween("2026-09-01", "2026-06-01")).toBe(-3);
  expect(monthsWindow("2026-06-15", 3)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01"]);
});

test("monthLabel en español", () => {
  expect(monthLabel("2026-06-01")).toBe("Junio 2026");
  expect(monthLabel("2026-06-01", false)).toBe("Junio");
});

test("occurrenceIndex: once solo el mes de inicio", () => {
  const item: ProjItem = {
    id: "1", name: "x", paymentMethod: "g", amount: 100, currency: "ARS",
    recurrence: "once", startMonth: "2026-06-01", installmentsTotal: null,
  };
  expect(occurrenceIndex(item, "2026-06-01")).toBe(0);
  expect(occurrenceIndex(item, "2026-07-01")).toBeNull();
  expect(occurrenceIndex(item, "2026-05-01")).toBeNull();
});

test("occurrenceIndex: monthly desde el inicio en adelante", () => {
  const item: ProjItem = {
    id: "1", name: "x", paymentMethod: "g", amount: 100, currency: "ARS",
    recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null,
  };
  expect(occurrenceIndex(item, "2026-06-01")).toBe(0);
  expect(occurrenceIndex(item, "2026-09-01")).toBe(3);
  expect(occurrenceIndex(item, "2026-05-01")).toBeNull();
});

test("occurrenceIndex: installments solo N meses", () => {
  const item: ProjItem = {
    id: "1", name: "concierto", paymentMethod: "g", amount: 43333, currency: "ARS",
    recurrence: "installments", startMonth: "2026-06-01", installmentsTotal: 6,
  };
  expect(occurrenceIndex(item, "2026-06-01")).toBe(0);
  expect(occurrenceIndex(item, "2026-11-01")).toBe(5); // 6ta cuota
  expect(occurrenceIndex(item, "2026-12-01")).toBeNull(); // ya terminó
});

test("debtToProjItem: cuota mensual → installments con N = ceil(remaining/monthly)", () => {
  const item = debtToProjItem(
    { id: "d1", name: "Préstamo", currency: "ARS", remaining_amount: 1000, monthly_payment: 300, next_payment_date: "2026-06-10" },
    "2026-06-01",
  );
  expect(item).not.toBeNull();
  expect(item!.recurrence).toBe("installments");
  expect(item!.installmentsTotal).toBe(4); // ceil(1000/300)
  expect(item!.startMonth).toBe("2026-06-01");
  expect(item!.paymentMethod).toBe("Deudas");
  expect(item!.amount).toBe(300);
});

test("debtToProjItem: sin cuota mensual → null", () => {
  expect(
    debtToProjItem({ id: "d", name: "x", currency: "ARS", remaining_amount: 100, monthly_payment: null, next_payment_date: null }, "2026-06-01"),
  ).toBeNull();
});

test("projectionToText: resumen legible con saldo, neto y aviso de déficit", () => {
  const proj = buildProjection({
    items: [
      { id: "a", name: "Alquiler", paymentMethod: "Débito", amount: 950000, currency: "ARS", recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null },
    ],
    window: monthsWindow("2026-06-01", 2),
    defaultIncomeArs: 500000,
    incomeOverrides: {},
    mep: 1000,
    startingBalanceArs: 100000,
  });
  const text = projectionToText(proj);
  expect(text).toContain("Mi Platica — Proyección (2 meses)");
  expect(text).toContain("Efectivo hoy: $100.000");
  expect(text).toContain("Junio 2026");
  expect(text).toContain("Te quedás sin efectivo"); // déficit: gasto > ingreso
});

test("buildProjection: agrupa, subtotaliza y calcula neto vs ingreso", () => {
  const items: ProjItem[] = [
    { id: "a", name: "Alquiler", paymentMethod: "Débito", amount: 950000, currency: "ARS", recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null },
    { id: "b", name: "Concierto", paymentMethod: "TDC VISA", amount: 43333, currency: "ARS", recurrence: "installments", startMonth: "2026-06-01", installmentsTotal: 2 },
    { id: "c", name: "Mercado Libre", paymentMethod: "TDC VISA", amount: 8000, currency: "ARS", recurrence: "once", startMonth: "2026-06-01", installmentsTotal: null },
  ];
  const proj = buildProjection({
    items,
    window: monthsWindow("2026-06-01", 3),
    defaultIncomeArs: 2100000,
    incomeOverrides: { "2026-08-01": 3000000 },
    mep: 1000,
  });

  expect(proj.months).toHaveLength(3);

  // Junio: alquiler 950k + (visa: concierto 43333 + ml 8000 = 51333) = 1.001.333
  const jun = proj.months[0];
  expect(jun.totalArs).toBe(950000 + 43333 + 8000);
  const visa = jun.groups.find((g) => g.paymentMethod === "TDC VISA")!;
  expect(visa.subtotalArs).toBe(51333);
  expect(visa.lines.find((l) => l.id === "b")!.installmentLabel).toBe("1/2");
  expect(jun.incomeArs).toBe(2100000);
  expect(jun.netArs).toBe(2100000 - 1001333);
  // USD vía mep=1000
  expect(jun.totalUsd).toBeCloseTo(1001.333, 3);

  // Julio: concierto cuota 2/2 sigue, ML (once) ya no, alquiler sigue.
  const jul = proj.months[1];
  expect(jul.totalArs).toBe(950000 + 43333);
  expect(jul.groups.find((g) => g.paymentMethod === "TDC VISA")!.lines.find((l) => l.id === "b")!.installmentLabel).toBe("2/2");

  // Agosto: concierto terminó (solo 2 cuotas), queda alquiler. Ingreso override.
  const ago = proj.months[2];
  expect(ago.totalArs).toBe(950000);
  expect(ago.incomeArs).toBe(3000000);
  expect(ago.netArs).toBe(3000000 - 950000);
});

test("buildProjection: saldo acumulado siembra desde el efectivo y detecta el mes en rojo", () => {
  // Efectivo hoy 100k. Ingreso 50k/mes, alquiler 80k/mes → neto −30k/mes.
  // Acumulado: 70k, 40k, 10k, −20k (mes 4 = primer rojo).
  const proj = buildProjection({
    items: [
      { id: "a", name: "Alquiler", paymentMethod: "Débito", amount: 80000, currency: "ARS", recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null },
    ],
    window: monthsWindow("2026-06-01", 4),
    defaultIncomeArs: 50000,
    incomeOverrides: {},
    mep: null,
    startingBalanceArs: 100000,
  });

  expect(proj.startingBalanceArs).toBe(100000);
  expect(proj.months.map((m) => m.cumulativeArs)).toEqual([70000, 40000, 10000, -20000]);
  expect(proj.firstDeficitMonth).toBe("2026-09-01");
  expect(proj.deficitMonthCount).toBe(4); // los 4 meses tienen neto negativo
});

test("buildProjection: accrueFirstMonth=false → el mes en curso no acumula (queda en el efectivo de hoy)", () => {
  // Efectivo 100k, neto −30k/mes. Con el mes en curso informativo, el saldo del
  // mes 0 queda en 100k y recién el mes 1 acumula: 100k, 70k, 40k, 10k.
  const proj = buildProjection({
    items: [
      { id: "a", name: "Alquiler", paymentMethod: "Débito", amount: 80000, currency: "ARS", recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null },
    ],
    window: monthsWindow("2026-06-01", 4),
    defaultIncomeArs: 50000,
    incomeOverrides: {},
    mep: null,
    startingBalanceArs: 100000,
    accrueFirstMonth: false,
  });
  expect(proj.months.map((m) => m.cumulativeArs)).toEqual([100000, 70000, 40000, 10000]);
  expect(proj.firstDeficitMonth).toBeNull(); // nunca baja de 0 en la ventana
  expect(proj.deficitMonthCount).toBe(4); // los netos mensuales siguen siendo negativos
});

test("buildProjection: sin déficit acumulado → firstDeficitMonth null", () => {
  const proj = buildProjection({
    items: [
      { id: "a", name: "Servicio", paymentMethod: "Débito", amount: 10000, currency: "ARS", recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null },
    ],
    window: monthsWindow("2026-06-01", 3),
    defaultIncomeArs: 50000,
    incomeOverrides: {},
    mep: 1000,
    startingBalanceArs: 0,
  });
  expect(proj.firstDeficitMonth).toBeNull();
  expect(proj.deficitMonthCount).toBe(0);
  expect(proj.months.map((m) => m.cumulativeArs)).toEqual([40000, 80000, 120000]);
  expect(proj.months[2].cumulativeUsd).toBeCloseTo(120, 6); // 120000 / 1000
});

test("frenchPayment: tasa 0 → capital / n", () => {
  expect(frenchPayment(120000, 0, 12)).toBe(10000);
});

test("frenchPayment: cuota fija con interés", () => {
  // 100.000 a 60% TNA (5% mensual) en 12 cuotas → ~11.282,54
  expect(frenchPayment(100000, 60, 12)).toBeCloseTo(11282.54, 2);
});

test("buildProjection: cuotas con interés → amount es capital, proyecta la cuota", () => {
  const item: ProjItem = {
    id: "tv", name: "TV", paymentMethod: "TDC VISA", amount: 100000, currency: "ARS",
    recurrence: "installments", startMonth: "2026-06-01", installmentsTotal: 12, interestRate: 60,
  };
  const proj = buildProjection({
    items: [item],
    window: monthsWindow("2026-06-01", 1),
    defaultIncomeArs: 0,
    incomeOverrides: {},
    mep: null,
  });
  const line = proj.months[0].groups[0].lines[0];
  expect(line.amountArs).toBeCloseTo(11282.54, 2);
  expect(line.installmentLabel).toBe("1/12");
});

test("buildProjection: cuotas sin interés → amount se usa directo (no rompe)", () => {
  const item: ProjItem = {
    id: "c", name: "Concierto", paymentMethod: "g", amount: 43333, currency: "ARS",
    recurrence: "installments", startMonth: "2026-06-01", installmentsTotal: 2,
  };
  const proj = buildProjection({
    items: [item],
    window: monthsWindow("2026-06-01", 1),
    defaultIncomeArs: 0,
    incomeOverrides: {},
    mep: null,
  });
  expect(proj.months[0].groups[0].lines[0].amountArs).toBe(43333);
});

test("buildProjection: sin mep → montos USD null", () => {
  const proj = buildProjection({
    items: [{ id: "a", name: "x", paymentMethod: "g", amount: 1000, currency: "ARS", recurrence: "monthly", startMonth: "2026-06-01", installmentsTotal: null }],
    window: monthsWindow("2026-06-01", 1),
    defaultIncomeArs: 5000,
    incomeOverrides: {},
    mep: null,
  });
  expect(proj.months[0].totalUsd).toBeNull();
  expect(proj.months[0].netUsd).toBeNull();
  expect(proj.months[0].netArs).toBe(5000 - 1000);
});
