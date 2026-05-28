import { expect, test } from "bun:test";
import { detectDelimiter, parseCsv } from "./csv";

test("detecta el delimitador (coma vs punto y coma)", () => {
  expect(detectDelimiter("a;b;c")).toBe(";");
  expect(detectDelimiter("a,b,c")).toBe(",");
});

test("parsea campos entre comillas con delimitador y saltos internos", () => {
  const rows = parseCsv('a,b\n"x,y","line1\nline2"');
  expect(rows).toEqual([
    ["a", "b"],
    ["x,y", "line1\nline2"],
  ]);
});

test("maneja comillas escapadas y descarta BOM", () => {
  const rows = parseCsv('﻿name\n"He said ""hi"""');
  expect(rows[0]).toEqual(["name"]);
  expect(rows[1]).toEqual(['He said "hi"']);
});

test("descarta filas vacías", () => {
  expect(parseCsv("a\n\n\nb")).toEqual([["a"], ["b"]]);
});
