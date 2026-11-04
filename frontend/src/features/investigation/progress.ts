import { useQuery } from "@tanstack/react-query";
import { ApiError, fetchJson } from "../cases/api";
import { openInvestigation } from "../board/api";

export interface InterviewApproach { id: string; label: string }
export interface CaseAction { approaches?: InterviewApproach[]; id: string; kind: string; personId: string | null; label: string; requiresRoute: boolean }
export interface ActionHistory { approach?: InterviewApproach | null; id: string; personId: string | null; label: string; response: string }
export interface Progress { version: number; isReconstructed: boolean; reviewedEvidenceIds: string[]; actions: CaseAction[]; history: ActionHistory[] }
function record(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null; }
function isApproach(v: unknown): v is InterviewApproach { return record(v) && typeof v.id === "string" && v.id.length > 0 && typeof v.label === "string" && v.label.length > 0; }
export function isProgress(v: unknown): v is Progress {
  return record(v) && Number.isInteger(v.version) && (v.version as number) >= 0 && typeof v.isReconstructed === "boolean" && Array.isArray(v.reviewedEvidenceIds) && v.reviewedEvidenceIds.every(id => typeof id === "string") &&
    Array.isArray(v.actions) && v.actions.every(a => record(a) && ["id", "kind", "label"].every(k => typeof a[k] === "string") && (a.personId === null || typeof a.personId === "string") && typeof a.requiresRoute === "boolean" && (a.approaches === undefined || Array.isArray(a.approaches) && a.approaches.every(isApproach))) &&
    Array.isArray(v.history) && v.history.every(a => record(a) && ["id", "label", "response"].every(k => typeof a[k] === "string") && (a.personId === null || typeof a.personId === "string") && (a.approach == null || isApproach(a.approach)));
}
export async function readProgress(caseId: string): Promise<Progress> {
  const path = `/api/cases/${encodeURIComponent(caseId)}/investigation/progress`;
  try { return await fetchJson<Progress>(path, undefined, isProgress); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    await openInvestigation(caseId);
    return fetchJson<Progress>(path, undefined, isProgress);
  }
}
export function useProgress(caseId: string, enabled = true) {
  return useQuery({ queryKey: ["progress", caseId], enabled, queryFn: () => readProgress(caseId), staleTime: 0, refetchOnWindowFocus: false });
}
export async function progressCommand(caseId: string, path: string, locationIds?: string[], choice?: { approachId: string; expectedVersion: number }): Promise<Progress> {
  const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/investigation/${path}`, {
    method: "POST", credentials: "same-origin", keepalive: true, headers: { "X-ColdCase-Request": "1", "Content-Type": "application/json" }, body: JSON.stringify({ locationIds: locationIds ?? null, ...choice }),
  });
  if (!response.ok) {
    const error = new ApiError(response.status);
    error.message = response.status === 409 ? "Etterforskningen er endret i en annen fane. Oppdater opplysningene og prøv igjen." : response.status === 400 ? "Valget eller ruten er ikke tilgjengelig. Oppdater opplysningene og prøv igjen." : "Opplysningen er ikke tilgjengelig, eller forbindelsen ble brutt. Oppdater og prøv igjen.";
    throw error;
  }
  const value: unknown = await response.json();
  if (!isProgress(value)) throw new Error("Ugyldige etterforskningsopplysninger.");
  return value;
}
