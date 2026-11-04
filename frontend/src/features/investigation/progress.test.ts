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
