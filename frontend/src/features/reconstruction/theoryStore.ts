import { create } from "zustand";
import { persist } from "zustand/middleware";
export interface TheoryDraft { answers: Record<string, string>; evidenceIds: string[] }
interface TheoryState {
  routes: Record<string, string[]>;
  theories: Record<string, TheoryDraft>;
  setRoute: (caseId: string, path: string[]) => void;
  setTheory: (caseId: string, draft: TheoryDraft) => void;
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ids = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && v.every(id => typeof id === "string" && id.length <= 64);
export function restoreDrafts(persisted: unknown, current: TheoryState): TheoryState {
  if (!record(persisted)) return current;
  const routes: Record<string, string[]> = {};
  const theories: Record<string, TheoryDraft> = {};
  if (record(persisted.routes)) for (const [key, value] of Object.entries(persisted.routes)) if (/^[a-zA-Z0-9_-]{1,32}$/.test(key) && ids(value, 24)) routes[key] = value;
  if (record(persisted.theories)) for (const [key, value] of Object.entries(persisted.theories)) {
    if (/^[a-zA-Z0-9_-]{1,32}$/.test(key) && record(value) && record(value.answers) && Object.keys(value.answers).length <= 20 &&
      Object.entries(value.answers).every(([k, v]) => k.length <= 64 && typeof v === "string" && v.length <= 64) && ids(value.evidenceIds, 50)) theories[key] = value as unknown as TheoryDraft;
  }
  return { ...current, routes, theories };
}
// Draft hypotheses only; neither this store nor its contents authorize any game progress.
export const useTheoryStore = create<TheoryState>()(persist(set => ({
  routes: {}, theories: {},
  setRoute: (caseId, path) => set(state => ({ routes: { ...state.routes, [caseId]: path } })),
  setTheory: (caseId, draft) => set(state => ({ theories: { ...state.theories, [caseId]: draft } })),
}), { name: "cold-case-theory-drafts", version: 1, merge: restoreDrafts }));
export const emptyRoute: string[] = [];
export const emptyTheory: TheoryDraft = { answers: {}, evidenceIds: [] };
