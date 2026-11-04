import { afterEach, expect, it, vi } from "vitest";
import { isReconstructionView, submitReconstruction } from "./api";
import { restoreDrafts, useTheoryStore } from "./theoryStore";
afterEach(() => vi.unstubAllGlobals());
it("keeps the closed view separate from the theory form", () => {
  expect(isReconstructionView({ isClosed: true, epilogue: "En avslutning." })).toBe(true);
  expect(isReconstructionView({ isClosed: true, epilogue: null })).toBe(false);
  expect(isReconstructionView({ isClosed: false, questions: [] })).toBe(false);
});
it("restores only bounded draft values without replacing store methods", () => {
  const current = useTheoryStore.getState();
  const restored = restoreDrafts({ routes: { "1999-1218": ["hotel", "market"], bad: [null] }, theories: { "1999-1218": { answers: { driver: "a guess" }, evidenceIds: ["known-source"] } }, setRoute: "bad" }, current);
  expect(restored.routes["1999-1218"]).toEqual(["hotel", "market"]);
  expect(restored.routes.bad).toBeUndefined();
  expect(restored.setRoute).toBe(current.setRoute);
});
it("returns an incorrect theory as recoverable feedback", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accepted: false, message: "Undersøk videre." }))));
  await expect(submitReconstruction("1999-1218", { answers: {}, evidenceIds: [], routeIds: [] })).resolves.toEqual({ accepted: false, message: "Undersøk videre." });
});
