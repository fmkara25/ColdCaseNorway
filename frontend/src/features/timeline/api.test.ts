import { expect, it } from "vitest";
import { elapsedMinutes, formatTime, isTimeline, type TimelineEvent } from "./api";
const event: TimelineEvent = { id: "witness", title: "Sett ved butikken", description: "Vitneopplysning", sourceEvidenceId: "witness", minuteOfDay: 1331, isEstimate: true, isPlanned: false };
it("formats local case time without using the browser timezone", () => {
  expect(formatTime(1331)).toBe("22.11");
  expect(formatTime(0)).toBe("00.00");
  expect(formatTime(null)).toBe("Ukjent");
});
it("compares known times without treating the unknown interval as midnight", () => {
  expect(elapsedMinutes(event, { ...event, minuteOfDay: 1365 })).toBe(34);
  expect(elapsedMinutes(event, { ...event, minuteOfDay: null })).toBeNull();
});
it("validates timeline data and rejects impossible times", () => {
  expect(isTimeline([event])).toBe(true);
  expect(isTimeline([{ ...event, minuteOfDay: 1440 }])).toBe(false);
  expect(isTimeline([{ ...event, isPlanned: "yes" }])).toBe(false);
});
