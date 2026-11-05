import { ApiError } from "../cases/api";

export interface MapLocation { id: string; name: string; description: string; x: number; y: number }
export interface MapRoad { id: string; fromLocationId: string; toLocationId: string; meters: number; walkMinutesMin: number; walkMinutesMax: number; driveMinutesMin: number; driveMinutesMax: number }
export interface MapGraph { locations: MapLocation[]; roads: MapRoad[] }
export interface RouteEstimate { meters: number; walkMinutesMin: number; walkMinutesMax: number; driveMinutesMin: number; driveMinutesMax: number }
export function isConnectedRoute(path: string[], graph: MapGraph): boolean {
  return path.length >= 2 && path.length <= 24 && path.every(id => graph.locations.some(point => point.id === id)) &&
    path.slice(1).every((id, index) => graph.roads.some(road =>
      road.fromLocationId === path[index] && road.toLocationId === id || road.toLocationId === path[index] && road.fromLocationId === id));
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function positive(value: unknown): value is number { return Number.isInteger(value) && (value as number) > 0; }
export function isRouteEstimate(value: unknown): value is RouteEstimate {
  return record(value) && ["meters", "walkMinutesMin", "walkMinutesMax", "driveMinutesMin", "driveMinutesMax"].every(key => positive(value[key])) &&
    (value.walkMinutesMax as number) >= (value.walkMinutesMin as number) && (value.driveMinutesMax as number) >= (value.driveMinutesMin as number);
}
export function isMapGraph(value: unknown): value is MapGraph {
  if (!record(value) || !Array.isArray(value.locations) || !Array.isArray(value.roads)) return false;
  const locations = value.locations;
  if (!locations.every(item => record(item) && ["id", "name", "description"].every(key => typeof item[key] === "string" && item[key].length > 0) &&
    Number.isInteger(item.x) && Number.isInteger(item.y) && (item.x as number) >= 0 && (item.x as number) <= 1000 && (item.y as number) >= 0 && (item.y as number) <= 700)) return false;
  const ids = new Set(locations.map(item => item.id));
  return ids.size === locations.length && new Set(value.roads.map(item => item?.id)).size === value.roads.length && value.roads.every(item => record(item) && typeof item.id === "string" &&
    ids.has(item.fromLocationId) && ids.has(item.toLocationId) && item.fromLocationId !== item.toLocationId && isRouteEstimate(item));
}
export async function estimateRoute(caseId: string, locationIds: string[], signal?: AbortSignal): Promise<RouteEstimate> {
  const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/map/estimate`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationIds }), signal,
  });
  if (!response.ok) throw new ApiError(response.status);
  const value: unknown = await response.json();
  if (!isRouteEstimate(value)) throw new Error("Ugyldig ruteberegning.");
  return value;
}
export function compareWindow(min: number, max: number, available: number | null) {
  if (available === null || !Number.isFinite(available) || available < 0) return "";
  if (min > available) return "Tidsanslaget overstiger det valgte tidsrommet.";
  if (max > available) return "Bare deler av tidsanslaget passer innenfor tidsrommet.";
  return "Tidsanslaget passer innenfor tidsrommet. Det bekrefter ikke at reisen fant sted.";
}
