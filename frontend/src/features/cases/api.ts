import { isArchiveImagePath } from "../../components/imagePath";
export interface CaseSummary {
  id: string;
  title: string;
  location: string;
  disappearanceDate: string;
  missingPerson: string;
  age: number;
  summary: string;
  coverImagePath?: string | null;
  missingPersonPortraitPath?: string | null;
}

export interface CaseFile extends CaseSummary {
  initialReport: string;
}

export class ApiError extends Error {
  public status: number;

  constructor(status: number) {
    super(status === 404 ? "Saken finnes ikke." : "Kunne ikke hente saksopplysningene.");
    this.status = status;
  }
}

export async function fetchJson<T>(path: string, signal?: AbortSignal, validate?: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new ApiError(response.status);
  const value: unknown = await response.json();
  if (validate && !validate(value)) throw new Error("Ugyldige saksopplysninger.");
  return value as T;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(value + "T00:00:00Z"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCaseSummary(value: unknown): value is CaseSummary {
  if (!isRecord(value)) return false;
  const strings = ["id", "title", "location", "missingPerson", "summary"];
  if (!strings.every(key => typeof value[key] === "string" && value[key].length > 0)) return false;
  if (!isArchiveImagePath(value.coverImagePath) || !isArchiveImagePath(value.missingPersonPortraitPath)) return false;
  if (!Number.isInteger(value.age) || (value.age as number) < 0) return false;
  if (typeof value.disappearanceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.disappearanceDate)) return false;
  const date = new Date(value.disappearanceDate + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value.disappearanceDate;
}

export function isCaseList(value: unknown): value is CaseSummary[] {
  return Array.isArray(value) && value.every(isCaseSummary);
}

export function isCaseFile(value: unknown): value is CaseFile {
  return isCaseSummary(value) && isRecord(value) && typeof value.initialReport === "string" && value.initialReport.length > 0;
}
