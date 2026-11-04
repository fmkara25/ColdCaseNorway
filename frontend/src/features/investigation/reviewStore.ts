import { create } from "zustand";
import { persist } from "zustand/middleware";

// Local reading aid only. Never use this client state to authorize hidden content.
interface ReviewState {
  reviewed: Record<string, string[]>;
  markReviewed: (caseId: string, evidenceId: string) => void;
}
export const useReviewStore = create<ReviewState>()(persist((set) => ({
  reviewed: {},
  markReviewed: (caseId, evidenceId) => set(state => ({
    reviewed: { ...state.reviewed, [caseId]: [...new Set([...(state.reviewed[caseId] ?? []), evidenceId])] },
  })),
}), { name: "cold-case-reading-progress", version: 1 }));
