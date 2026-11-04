export interface Evidence {
  id: string;
  title: string;
  kind: string;
  source: string;
  body: string;
}
export function isEvidenceList(value: unknown): value is Evidence[] {
  return Array.isArray(value) && value.every(item => item && typeof item === "object" &&
    ["id", "title", "kind", "source", "body"].every(key => typeof item[key] === "string" && item[key].length > 0));
}
