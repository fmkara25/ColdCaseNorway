import { expect, it } from "vitest";
import { addComparison } from "./comparison";
import type { BoardSnapshot } from "../board/api";
const initial: BoardSnapshot = { version:7, board:{ schemaVersion:1, notes:[{ id:"n", text:"Behold notatet" }],
  positions:[{ id:"note:n", x:40, y:40 }], connections:[] } };
const accessible = new Set(["evidence:a", "person:b"]);
it("adds missing references and a hypothesis without modifying the original snapshot", () => {
  const before = structuredClone(initial);
  const next = addComparison(initial, "evidence:a", "person:b", "  Undersøk forskjellen  ", accessible, "c");
  expect(initial).toEqual(before); expect(next.version).toBe(7);
  expect(next.board.notes).toEqual(before.board.notes);
  expect(next.board.positions[0]).toEqual(before.board.positions[0]);
  expect(next.board.positions).toHaveLength(3);
  expect(next.board.positions[1]).not.toMatchObject({ x:40, y:40 });
  expect(next.board.connections).toEqual([{ id:"c", fromId:"evidence:a", toId:"person:b", label:"Undersøk forskjellen" }]);
});
it("keeps already pinned coordinates and unrelated connections unchanged", () => {
  const existing: BoardSnapshot = { version:2, board:{ ...initial.board,
    positions:[...initial.board.positions, { id:"evidence:a", x:1000, y:1700 }],
    connections:[{ id:"old", fromId:"note:n", toId:"evidence:a", label:"Tidligere hypotese" }] } };
  const next = addComparison(existing, "evidence:a", "person:b", "Ny hypotese", accessible, "new");
  expect(next.board.positions[1]).toEqual(existing.board.positions[1]);
  expect(next.board.connections[0]).toEqual(existing.board.connections[0]);
});
it("rejects inaccessible, self and duplicate pairs instead of rewriting a saved label", () => {
  expect(() => addComparison(initial, "evidence:hidden", "person:b", "x", accessible, "c")).toThrow("tilgjengelige");
  expect(() => addComparison(initial, "person:b", "person:b", "x", accessible, "c")).toThrow("ulike");
  const saved = addComparison(initial, "evidence:a", "person:b", "Behold teksten", accessible, "c");
  expect(() => addComparison(saved, "person:b", "evidence:a", "Overskriv", accessible, "other")).toThrow("allerede");
  expect(saved.board.connections[0].label).toBe("Behold teksten");
});
it("enforces board limits and requires a bounded hypothesis", () => {
  for (const label of ["   ", "x".repeat(121)]) expect(() => addComparison(initial, "evidence:a", "person:b", label, accessible, "c")).toThrow("120");
  const full: BoardSnapshot = { version:1, board:{ ...initial.board, positions:Array.from({ length:128 }, (_,i) => ({ id:`note:${i}`, x:i * 20, y:0 })) } };
  expect(() => addComparison(full, "evidence:a", "person:b", "x", accessible, "c")).toThrow("plass");
});
