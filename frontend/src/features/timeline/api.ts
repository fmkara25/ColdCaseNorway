export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  sourceEvidenceId: string | null;
  minuteOfDay: number | null;
  isEstimate: boolean;
  isPlanned: boolean;
}
export function isTimeline(value: unknown): value is TimelineEvent[] {
  return Array.isArray(value) && value.every(item => item && typeof item === "object" &&
    ["id", "title", "description"].every(key => typeof item[key] === "string" && item[key].length > 0) &&
    (item.sourceEvidenceId === null || typeof item.sourceEvidenceId === "string") &&
    (item.minuteOfDay === null || (Number.isInteger(item.minuteOfDay) && item.minuteOfDay >= 0 && item.minuteOfDay < 1440)) &&
    typeof item.isEstimate === "boolean" && typeof item.isPlanned === "boolean");
}
export function formatTime(minutes: number | null) {
  if (minutes === null) return "Ukjent";
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}.${(minutes % 60).toString().padStart(2, "0")}`;
}
export function elapsedMinutes(first: TimelineEvent, second: TimelineEvent): number | null {
  if (first.minuteOfDay === null || second.minuteOfDay === null) return null;
  return Math.abs(second.minuteOfDay - first.minuteOfDay);
}
