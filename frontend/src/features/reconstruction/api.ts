import { ApiError, fetchJson } from "../cases/api";
import { readProgress } from "../investigation/progress";
export interface TheoryQuestion { id: string; label: string; options: { id: string; label: string }[] }
export interface OpenReconstruction { isClosed: false; questions: TheoryQuestion[]; minEvidence: number; maxEvidence: number; stopAllowanceMinutes: number; sources: { id: string; title: string; reviewed: boolean }[]; locations: { id: string; name: string }[] }
export type ReconstructionView = OpenReconstruction | { isClosed: true; epilogue: string };
export interface TheorySubmission { answers: Record<string, string>; evidenceIds: string[]; routeIds: string[] }
export interface Evaluation { accepted: boolean; message: string }
function record(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null; }
export function isReconstructionView(v: unknown): v is ReconstructionView {
  if (!record(v)) return false;
  if (v.isClosed === true) return typeof v.epilogue === "string";
  return v.isClosed === false && Number.isInteger(v.minEvidence) && Number.isInteger(v.maxEvidence) && (v.minEvidence as number) > 0 && (v.maxEvidence as number) >= (v.minEvidence as number) && Number.isInteger(v.stopAllowanceMinutes) && (v.stopAllowanceMinutes as number) >= 0 &&
    Array.isArray(v.questions) && v.questions.every(q => record(q) && typeof q.id === "string" && typeof q.label === "string" && Array.isArray(q.options) && q.options.every(o => record(o) && typeof o.id === "string" && typeof o.label === "string")) &&
    Array.isArray(v.sources) && v.sources.every(s => record(s) && typeof s.id === "string" && typeof s.title === "string" && typeof s.reviewed === "boolean") &&
    Array.isArray(v.locations) && v.locations.every(p => record(p) && typeof p.id === "string" && typeof p.name === "string");
}
export async function readReconstruction(caseId: string) {
  await readProgress(caseId);
  return fetchJson<ReconstructionView>(`/api/cases/${encodeURIComponent(caseId)}/investigation/reconstruction`, undefined, isReconstructionView);
}
export async function submitReconstruction(caseId: string, submission: TheorySubmission): Promise<Evaluation> {
  const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/investigation/reconstruction`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-ColdCase-Request": "1" }, body: JSON.stringify(submission) });
  if (!response.ok) throw new ApiError(response.status);
  const value: unknown = await response.json();
  if (!record(value) || typeof value.accepted !== "boolean" || typeof value.message !== "string") throw new Error("Ugyldig vurdering.");
  return value as unknown as Evaluation;
}
