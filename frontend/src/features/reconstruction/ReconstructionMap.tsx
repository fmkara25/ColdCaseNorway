import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isConnectedRoute, isMapGraph, type MapGraph } from "../map/api";
import { MapCanvas } from "../map/MapCanvas";
import { emptyRoute, useTheoryStore } from "./theoryStore";

export function ReconstructionMap({ caseId }: { caseId: string }) {
  const path = useTheoryStore(state => state.routes[caseId] ?? emptyRoute);
  const setRoute = useTheoryStore(state => state.setRoute);
  const map = useQuery({
    queryKey: ["cases", caseId, "map"],
    queryFn: ({ signal }) => fetchJson<MapGraph>(`/api/cases/${encodeURIComponent(caseId)}/map`, signal, isMapGraph),
  });

  if (!map.isSuccess) return <Feedback error={map.error} retry={() => void map.refetch()} />;
  const canAppend = (id: string) => path.length === 0 || isConnectedRoute([...path, id], map.data);
  const append = (id: string) => {
    if (canAppend(id)) setRoute(caseId, [...path, id]);
  };

  return <div className="reconstruction-inline-map">
    <MapCanvas graph={map.data} path={path} append={append} canAppend={canAppend} />
    <button disabled={!path.length} onClick={() => setRoute(caseId, path.slice(0, -1))}>Angre siste sted</button>
    <button disabled={!path.length} onClick={() => setRoute(caseId, [])}>Tøm ruteutkastet</button>
  </div>;
}
