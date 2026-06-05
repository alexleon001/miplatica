import { afterEach, describe, expect, it } from "bun:test";
import {
  categoriesByGroup,
  categoryById,
  isBuiltInCategory,
  registerCustomCategories,
  type Category,
} from "./categories";

const custom: Category = { id: "cat-1", label: "Mascota", icon: "🐶", color: "#F97316", group: "expense" };

afterEach(() => {
  registerCustomCategories([]); // limpiar el registry entre tests
});

describe("categoryById", () => {
  it("resuelve built-in", () => {
    expect(categoryById("food")?.label).toBe("Comida");
  });
  it("resuelve custom registradas", () => {
    registerCustomCategories([custom]);
    expect(categoryById("cat-1")?.label).toBe("Mascota");
  });
  it("devuelve undefined para id desconocido", () => {
    expect(categoryById("no-existe")).toBeUndefined();
    expect(categoryById(null)).toBeUndefined();
  });
});

describe("categoriesByGroup", () => {
  it("mergea built-in + custom del mismo grupo, built-in primero", () => {
    registerCustomCategories([custom]);
    const expense = categoriesByGroup("expense");
    expect(expense.some((c) => c.id === "food")).toBe(true);
    expect(expense[expense.length - 1].id).toBe("cat-1"); // custom al final
  });
  it("no incluye custom de otro grupo", () => {
    registerCustomCategories([custom]); // expense
    expect(categoriesByGroup("income").some((c) => c.id === "cat-1")).toBe(false);
  });
});

describe("isBuiltInCategory", () => {
  it("distingue built-in de custom", () => {
    registerCustomCategories([custom]);
    expect(isBuiltInCategory("food")).toBe(true);
    expect(isBuiltInCategory("cat-1")).toBe(false);
  });
});
