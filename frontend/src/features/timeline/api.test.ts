import { expect, it } from "vitest";
import { elapsedMinutes, formatTime, isTimeline, resolveTimeWindow, type TimelineEvent } from "./api";
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
it("resolves a time window only from two distinct authorized timed entries", () => {
  const planned = { ...event, id:"bus", minuteOfDay:1365, isEstimate:false, isPlanned:true };
  const resolved = resolveTimeWindow(["bus", "witness"], [event, planned]);
  expect(resolved?.minutes).toBe(34);
  expect(resolved?.events).toEqual([planned, event]);
  expect(resolveTimeWindow(["witness", "hidden"], [event, planned])).toBeNull();
  expect(resolveTimeWindow(["witness", "witness"], [event, planned])).toBeNull();
  expect(resolveTimeWindow(["witness"], [event, planned])).toBeNull();
  expect(resolveTimeWindow(["witness", "bus", "other"], [event, planned])).toBeNull();
  expect(resolveTimeWindow(["witness", "bus"], [event, { ...planned, minuteOfDay:null }])).toBeNull();
});
it("keeps a zero-minute interval valid without inventing an overnight journey", () => {
  expect(resolveTimeWindow(["a", "b"], [{ ...event, id:"a", minuteOfDay:0 }, { ...event, id:"b", minuteOfDay:0 }])?.minutes).toBe(0);
  expect(resolveTimeWindow(["a", "b"], [{ ...event, id:"a", minuteOfDay:1430 }, { ...event, id:"b", minuteOfDay:10 }])?.minutes).toBe(1420);
});
