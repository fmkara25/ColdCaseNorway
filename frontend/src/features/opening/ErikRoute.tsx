import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { estimateRoute, isConnectedRoute, isMapGraph, type MapGraph } from "../map/api";
import { MapCanvas } from "../map/MapCanvas";
import { formatTime, isTimeline, resolveTimeWindow, type TimelineEvent } from "../timeline/api";

export function ErikRoute({ caseId, submit }: { caseId: string; submit: (route: string[]) => void }) {
  const root = `/api/cases/${encodeURIComponent(caseId)}`;
  const [path, setPath] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const map = useQuery({
    queryKey: ["cases", caseId, "map"],
    queryFn: ({ signal }) => fetchJson<MapGraph>(root + "/map", signal, isMapGraph),
  });
  const timeline = useQuery({
    queryKey: ["cases", caseId, "timeline"],
    queryFn: ({ signal }) => fetchJson<TimelineEvent[]>(root + "/timeline", signal, isTimeline),
  });
  const estimate = useQuery({
    queryKey: ["cases", caseId, "route", path],
    enabled: map.isSuccess && isConnectedRoute(path, map.data),
    queryFn: ({ signal }) => estimateRoute(caseId, path, signal),
  });
  if (!map.isSuccess || !timeline.isSuccess) return <Feedback error={map.error ?? timeline.error}
    retry={() => { void map.refetch(); void timeline.refetch(); }} />;
  const window = resolveTimeWindow(["vehicle-pickup", "erik-location"], timeline.data);
  if (!window) return <p role="alert">Tidskortene er ikke tilgjengelige. Åpne kildene på nytt.</p>;
  const canAppend = (id: string) => path.length === 0 || (path.length === 1 && isConnectedRoute([...path, id], map.data));
  const append = (id: string) => {
    if (!canAppend(id)) return;
    setHint("");
    setPath([...path, id]);
  };
  const relevant = path[0] === "market" && path[1] === "payphone";
  return <div className="opening-route">
    <h2>Kunne samme sjåfør ha rukket begge stedene?</h2>
    <div className="opening-times" aria-label="Tidskort">
      {window.events.map(event => <div key={event.id}><strong>{event.isEstimate ? "ca. " : ""}{formatTime(event.minuteOfDay)}</strong><br />{event.title}</div>)}
    </div>
    <p>Velg start og mål på kartet. Prøv ruten fra påstigningen til stedet i Eriks opplysninger.</p>
    <MapCanvas graph={map.data} path={path} append={append} canAppend={canAppend} />
    <button disabled={!path.length} onClick={() => { setPath([]); setHint(""); }}>Tøm ruten</button>
    {estimate.isError && <button onClick={() => void estimate.refetch()}>Prøv ruteberegningen igjen</button>}
    {estimate.isSuccess && path.length === 2 && <>
      <p role="status">Anslått kjøretid i vinterføre: {estimate.data.driveMinutesMin}–{estimate.data.driveMinutesMax} minutter.</p>
      {!relevant ? <p>Prøv en rute mellom stedene som hører til tidskortene, i riktig rekkefølge.</p> : <>
        <button onClick={() => setHint("Sammenlign tidsrommet mellom kortene med den korteste kjøretiden.")}>Ja, tidspunktene passer med ruten.</button>
        <button onClick={() => submit(path)}>Nei, tidsrommet virker for kort for denne ruten.</button>
        <button onClick={() => setHint("Du har prøvd én rute. Hva kan akkurat den fortelle deg?")}>Dette utelukker Erik fra hele saken.</button>
      </>}
    </>}
    <p className="opening-hint" role="status">{hint}</p>
  </div>;
}
