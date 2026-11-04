export interface CaseSummary {
  id: string;
  title: string;
  location: string;
  disappearanceDate: string;
  missingPerson: string;
  age: number;
  summary: string;
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

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(value + "T00:00:00Z"));
}
