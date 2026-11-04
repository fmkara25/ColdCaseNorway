import { afterEach, expect, it, vi } from "vitest";
import { compareWindow, estimateRoute, isMapGraph, isRouteEstimate } from "./api";
const estimate = { meters: 800, walkMinutesMin: 10, walkMinutesMax: 14, driveMinutesMin: 2, driveMinutesMax: 4 };
const graph = { locations: [{ id: "hotel", name: "Hotell", description: "Arbeidssted", x: 10, y: 20 }, { id: "market", name: "Butikk", description: "Observasjon", x: 50, y: 60 }], roads: [{ ...estimate, id: "road", fromLocationId: "hotel", toLocationId: "market" }] };
afterEach(() => vi.unstubAllGlobals());
it("rejects dangling roads, duplicate places and impossible travel intervals", () => {
  expect(isMapGraph(graph)).toBe(true);
  expect(isMapGraph({ ...graph, locations: [graph.locations[0]] })).toBe(false);
  expect(isMapGraph({ ...graph, locations: [graph.locations[0], graph.locations[0]] })).toBe(false);
  expect(isRouteEstimate({ ...estimate, walkMinutesMax: 9 })).toBe(false);
  expect(isRouteEstimate({ ...estimate, meters: -1 })).toBe(false);
});
it("compares uncertain intervals without asserting a journey or guilt", () => {
  expect(compareWindow(10, 14, 9)).toContain("overstiger");
  expect(compareWindow(10, 14, 13)).toContain("Bare deler");
  expect(compareWindow(10, 14, 14)).toContain("bekrefter ikke");
  expect(compareWindow(10, 14, null)).toBe("");
  expect(compareWindow(10, 14, -1)).toBe("");
});
it("sends only selected place IDs and validates the server estimate", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(estimate)));
  vi.stubGlobal("fetch", fetchMock);
  await expect(estimateRoute("1999-1218", ["hotel", "market"])).resolves.toEqual(estimate);
  expect(fetchMock).toHaveBeenCalledWith("/api/cases/1999-1218/map/estimate", expect.objectContaining({ method: "POST", body: JSON.stringify({ locationIds: ["hotel", "market"] }) }));
});
it("does not treat hidden/disconnected route rejection as a valid estimate", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
  await expect(estimateRoute("1999-1218", ["market", "unknown"])).rejects.toMatchObject({ status: 400 });
});
