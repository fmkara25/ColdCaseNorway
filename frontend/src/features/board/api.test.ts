import { afterEach, expect, it, vi } from "vitest";
import { canConnect, isBoardSnapshot, openInvestigation, removeCard, saveBoard, type BoardState } from "./api";
const board: BoardState = { schemaVersion: 1, notes: [], positions: [{ id: "person:ingrid", x: 40, y: 50 }, { id: "evidence:bus-ticket", x: 250, y: 50 }], connections: [] };
afterEach(() => vi.unstubAllGlobals());
it("accepts valid snapshots and rejects invalid coordinates or schemas", () => {
  expect(isBoardSnapshot({ version: 0, board })).toBe(true);
  expect(isBoardSnapshot({ version: 0, board: { ...board, schemaVersion: 2 } })).toBe(false);
  expect(isBoardSnapshot({ version: 0, board: { ...board, positions: [{ id: "x", x: NaN, y: 0 }] } })).toBe(false);
});
it("prevents self/duplicate links and removes dangling connections with an unpinned card", () => {
  expect(canConnect(board, "person:ingrid", "evidence:bus-ticket")).toBe(true);
  expect(canConnect(board, "person:ingrid", "person:ingrid")).toBe(false);
  const connected = { ...board, connections: [{ id: "c", fromId: "person:ingrid", toId: "evidence:bus-ticket", label: "Undersøk" }] };
  expect(canConnect(connected, "evidence:bus-ticket", "person:ingrid")).toBe(false);
  expect(removeCard(connected, "person:ingrid").connections).toEqual([]);
});
it("uses same-origin cookies and the custom write header without exposing a token", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 0, board })));
  vi.stubGlobal("fetch", fetchMock);
  await openInvestigation("1999-1218");
  expect(fetchMock).toHaveBeenCalledWith("/api/cases/1999-1218/investigation", expect.objectContaining({ method: "POST", credentials: "same-origin", headers: { "X-ColdCase-Request": "1" } }));
});
it("surfaces a stale-write conflict so the draft is not silently overwritten", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 409 })));
  await expect(saveBoard("1999-1218", { version: 0, board })).rejects.toMatchObject({ status: 409, message: expect.stringContaining("beholdt") });
});
