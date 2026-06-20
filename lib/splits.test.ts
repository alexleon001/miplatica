import { expect, test } from "bun:test";
import {
  buildSplits,
  computeBalances,
  settlementText,
  simplifyDebts,
  splitByWeights,
  splitEqual,
  splitExact,
  splitsMatchTotal,
  type Balance,
} from "./splits";

// ── splitEqual ─────────────────────────────────────────────────────────────────
test("splitEqual divide exacto cuando es divisible", () => {
  const r = splitEqual(300, ["a", "b", "c"]);
  expect(r.map((x) => x.amount)).toEqual([100, 100, 100]);
});

test("splitEqual reparte el residuo de centavos a los primeros y la suma cierra", () => {
  const r = splitEqual(100, ["a", "b", "c"]); // 100/3 = 33.333...
  expect(r.map((x) => x.amount)).toEqual([33.34, 33.33, 33.33]);
  const sum = r.reduce((s, x) => s + x.amount, 0);
  expect(Math.round(sum * 100) / 100).toBe(100);
});

test("splitEqual con lista vacía devuelve vacío", () => {
  expect(splitEqual(100, [])).toEqual([]);
});

// ── splitExact ──────────────────────────────────────────────────────────────────
test("splitExact respeta los montos tipeados", () => {
  const r = splitExact({ a: 70, b: 30 });
  expect(r).toEqual([
    { member_id: "a", amount: 70, share: 70 },
    { member_id: "b", amount: 30, share: 30 },
  ]);
});

// ── splitByWeights (shares y percent) ────────────────────────────────────────────
test("splitByWeights reparte proporcional a los pesos", () => {
  const r = splitByWeights(300, { a: 2, b: 1 }); // 200 / 100
  const byId = Object.fromEntries(r.map((x) => [x.member_id, x.amount]));
  expect(byId).toEqual({ a: 200, b: 100 });
});

test("splitByWeights con porcentajes y residuo cierra exacto", () => {
  const r = splitByWeights(100, { a: 33.33, b: 33.33, c: 33.34 });
  const sum = r.reduce((s, x) => s + x.amount, 0);
  expect(Math.round(sum * 100) / 100).toBe(100);
});

test("splitByWeights sin pesos válidos cae a partes iguales", () => {
  const r = splitByWeights(100, { a: 0, b: 0 });
  expect(r.map((x) => x.amount)).toEqual([50, 50]);
});

// ── buildSplits (dispatcher) ──────────────────────────────────────────────────────
test("buildSplits enruta según el tipo", () => {
  expect(buildSplits("equal", 100, { memberIds: ["a", "b"] }).map((x) => x.amount)).toEqual([50, 50]);
  expect(buildSplits("exact", 100, { amounts: { a: 60, b: 40 } }).map((x) => x.amount)).toEqual([60, 40]);
  expect(buildSplits("shares", 90, { weights: { a: 1, b: 2 } }).map((x) => x.amount)).toEqual([30, 60]);
});

// ── splitsMatchTotal ──────────────────────────────────────────────────────────────
test("splitsMatchTotal tolera 1 centavo de redondeo", () => {
  expect(splitsMatchTotal(100, splitEqual(100, ["a", "b", "c"]))).toBe(true);
  expect(splitsMatchTotal(100, [{ member_id: "a", amount: 90 }])).toBe(false);
});

// ── computeBalances ───────────────────────────────────────────────────────────────
test("computeBalances: quien paga queda acreedor, los demás deudores", () => {
  // A paga 90, se reparte en 3 iguales (30 c/u).
  const splits = splitEqual(90, ["a", "b", "c"]).map((s) => ({ member_id: s.member_id, amount: s.amount }));
  const balances = computeBalances({
    memberIds: ["a", "b", "c"],
    expenses: [{ id: "e1", paidBy: "a", amount: 90 }],
    splits,
    settlements: [],
  });
  const byId = Object.fromEntries(balances.map((b) => [b.member_id, b.net]));
  expect(byId).toEqual({ a: 60, b: -30, c: -30 });
});

test("computeBalances: la suma neta global siempre es 0 (invariante)", () => {
  const splits1 = splitEqual(100, ["a", "b"]).map((s) => ({ member_id: s.member_id, amount: s.amount }));
  const splits2 = splitByWeights(50, { a: 1, b: 1, c: 2 }).map((s) => ({ member_id: s.member_id, amount: s.amount }));
  const balances = computeBalances({
    memberIds: ["a", "b", "c"],
    expenses: [
      { id: "e1", paidBy: "a", amount: 100 },
      { id: "e2", paidBy: "c", amount: 50 },
    ],
    splits: [...splits1, ...splits2],
    settlements: [{ from: "b", to: "a", amount: 10 }],
  });
  const sum = balances.reduce((s, b) => s + b.net, 0);
  expect(Math.round(sum * 100) / 100).toBe(0);
});

test("computeBalances: un settlement salda la deuda", () => {
  const balances = computeBalances({
    memberIds: ["a", "b"],
    expenses: [{ id: "e1", paidBy: "a", amount: 100 }],
    splits: [
      { member_id: "a", amount: 50 },
      { member_id: "b", amount: 50 },
    ],
    settlements: [{ from: "b", to: "a", amount: 50 }],
  });
  const byId = Object.fromEntries(balances.map((b) => [b.member_id, b.net]));
  expect(byId).toEqual({ a: 0, b: 0 });
});

// ── simplifyDebts ─────────────────────────────────────────────────────────────────
test("simplifyDebts genera la transferencia mínima", () => {
  const balances: Balance[] = [
    { member_id: "a", net: 60 },
    { member_id: "b", net: -30 },
    { member_id: "c", net: -30 },
  ];
  const t = simplifyDebts(balances);
  expect(t).toHaveLength(2);
  // Todos los deudores terminan pagando a A.
  for (const x of t) expect(x.to).toBe("a");
  expect(t.reduce((s, x) => s + x.amount, 0)).toBe(60);
});

test("simplifyDebts sin deudas devuelve vacío", () => {
  expect(simplifyDebts([{ member_id: "a", net: 0 }, { member_id: "b", net: 0 }])).toEqual([]);
});

test("simplifyDebts empareja correctamente con varios acreedores", () => {
  const balances: Balance[] = [
    { member_id: "a", net: 50 },
    { member_id: "b", net: 50 },
    { member_id: "c", net: -100 },
  ];
  const t = simplifyDebts(balances);
  expect(t).toHaveLength(2);
  for (const x of t) expect(x.from).toBe("c");
  expect(t.reduce((s, x) => s + x.amount, 0)).toBe(100);
});

// ── settlementText ────────────────────────────────────────────────────────────────
test("settlementText lista las transferencias", () => {
  const txt = settlementText(
    "Viaje",
    [{ from: "b", to: "a", amount: 30 }],
    (id) => (id === "a" ? "Ana" : "Beto"),
    (n) => `$${n}`,
  );
  expect(txt).toContain("Viaje");
  expect(txt).toContain("Beto → Ana: $30");
});

test("settlementText avisa cuando están a mano", () => {
  const txt = settlementText("Casa", [], (id) => id, (n) => `$${n}`);
  expect(txt).toContain("a mano");
});
