import { expect, it } from "vitest";
import { isPeople } from "./api";

it("rejects malformed people and accepts the empty register", () => {
  expect(isPeople([])).toBe(true);
  expect(isPeople([{ id: "ingrid", name: "Ingrid Solberg", age: 23, role: "Savnet", introduction: "Savnet i Skardal." }])).toBe(true);
  expect(isPeople([{ id: "hidden", age: 28 }])).toBe(false);
  expect(isPeople(null)).toBe(false);
});
