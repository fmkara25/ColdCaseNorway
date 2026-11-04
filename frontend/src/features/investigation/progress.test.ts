import { afterEach, expect, it, vi } from "vitest";
import { isProgress, progressCommand, readProgress } from "./progress";
const progress = { version: 1, isReconstructed: false, reviewedEvidenceIds: ["bus-ticket"], actions: [], history: [] };
afterEach(() => vi.unstubAllGlobals());
it("validates progress without needing hidden rules or answers", () => {
  expect(isProgress(progress)).toBe(true);
  expect(isProgress({ ...progress, actions: [{ id: "x", label: "x" }] })).toBe(false);
  expect(isProgress({ ...progress, history: [{ id: "x", response: null }] })).toBe(false);
});
it("reads an existing session without repeatedly creating it", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(progress)));
  vi.stubGlobal("fetch", fetchMock);
  await expect(readProgress("1999-1218")).resolves.toEqual(progress);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("creates a private session only after a missing-session response", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ version: 0, board: { schemaVersion: 1, notes: [], positions: [], connections: [] } })))
    .mockResolvedValueOnce(new Response(JSON.stringify(progress)));
  vi.stubGlobal("fetch", fetchMock);
  await expect(readProgress("1999-1218")).resolves.toEqual(progress);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("preserves an action conflict as a recoverable error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 409 })));
  await expect(progressCommand("1999-1218", "actions/example")).rejects.toMatchObject({ status: 409, message: expect.stringContaining("annen fane") });
});
it("validates approach labels and receipts without exposing authored answers", () => {
  const action = { id:"a", label:"Spør", kind:"interview", personId:"maria", requiresRoute:false, approaches:[{ id:"open", label:"Gi rom" }] };
  expect(isProgress({ ...progress, actions:[action] })).toBe(true);
  expect(isProgress({ ...progress, actions:[{ ...action, approaches:[{ id:"open", label:42 }] }] })).toBe(false);
  expect(isProgress({ ...progress, history:[{ id:"a", personId:"maria", label:"Spør", response:"Svar", approach:{ id:"open", label:"Gi rom" } }] })).toBe(true);
  expect(isProgress({ ...progress, history:[{ id:"a", personId:"maria", label:"Spør", response:"Svar", approach:{ id:42 } }] })).toBe(false);
});
it("submits the selected approach with the displayed investigation version", async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(progress))); vi.stubGlobal("fetch", mock);
  await progressCommand("1999-1218", "actions/maria-plan", undefined, { approachId:"document", expectedVersion:3 });
  expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({ locationIds:null, approachId:"document", expectedVersion:3 });
});
it("keeps failed interview writes recoverable in Bokmål without exposing transport errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch INTERNAL")));
  await expect(progressCommand("1999-1218", "actions/maria-plan")).rejects.toThrow("Forbindelsen ble brutt.");
});
it("does not render raw parser errors when a write receives an invalid response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>INTERNAL</html>")));
  await expect(progressCommand("1999-1218", "actions/maria-plan")).rejects.toThrow("Kunne ikke lese svaret.");
});
