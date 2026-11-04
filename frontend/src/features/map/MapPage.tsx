import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { compareWindow, estimateRoute, isMapGraph, type MapGraph } from "./api";

export function MapPage() {
  const { caseId = "" } = useParams();
  const query = useQuery({ queryKey: ["cases", caseId, "map"], queryFn: ({ signal }) => fetchJson<MapGraph>(`/api/cases/${encodeURIComponent(caseId)}/map`, signal, isMapGraph) });
  const [path, setPath] = useState<string[]>([]);
  const [mode, setMode] = useState<"walk" | "drive">("walk");
  const [stops, setStops] = useState(0);
  const [available, setAvailable] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; scale: number } | null>(null);
  const route = useQuery({ queryKey: ["cases", caseId, "route", path], enabled: path.length >= 2,
    queryFn: ({ signal }) => estimateRoute(caseId, path, signal) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const graph = query.data;
  const last = path.at(-1);
  const canAppend = (id: string) => path.length < 24 && (!last || graph.roads.some(road => (road.fromLocationId === last && road.toLocationId === id) || (road.toLocationId === last && road.fromLocationId === id)));
  const append = (id: string) => { if (canAppend(id)) setPath(current => [...current, id]); };
  const distance = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });
  const estimate = path.length >= 2 ? route.data : undefined;
  const min = estimate ? (mode === "walk" ? estimate.walkMinutesMin : estimate.driveMinutesMin) + stops : 0;
  const max = estimate ? (mode === "walk" ? estimate.walkMinutesMax : estimate.driveMinutesMax) + stops : 0;
  const message = estimate ? compareWindow(min, max, available === "" ? null : Number(available)) : "";
  return <>
    <div className="overview-heading"><p className="eyebrow">STED OG BEVEGELSE</p><h1>Kart</h1><p>Skardal er et fiktivt sted. Kartet er skjematisk; avstandene gjelder veinettet.</p></div>
    <div className="map-workspace"><section className="map-panel" aria-label="Kart over tilgjengelige steder">
      <div className="map-toolbar"><button aria-label="Zoom ut" disabled={zoom <= .75} onClick={() => setZoom(value => Math.max(.75, value - .25))}>−</button><span>{Math.round(zoom * 100)} %</span><button aria-label="Zoom inn" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + .25))}>+</button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Tilpass kart</button></div>
      <svg className="case-map" viewBox="40 80 850 500" aria-label="Veier og steder i Skardal" onPointerDown={event => {
        if ((event.target as Element).closest("[data-map-node]")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, scale: 850 / event.currentTarget.getBoundingClientRect().width };
      }} onPointerMove={event => { const d = drag.current; if (d) setPan({ x: d.panX + (event.clientX - d.x) * d.scale, y: d.panY + (event.clientY - d.y) * d.scale }); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <defs><pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#26343d" strokeWidth="1"/></pattern></defs>
        <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#map-grid)"/>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <path d="M80 50 Q320 190 300 340 T650 650" fill="none" stroke="#253c46" strokeWidth="32" opacity=".55"/>
          {graph.roads.map(road => {
            const from = graph.locations.find(point => point.id === road.fromLocationId)!;
            const to = graph.locations.find(point => point.id === road.toLocationId)!;
            const used = path.some((id, i) => i > 0 && ((path[i - 1] === from.id && id === to.id) || (path[i - 1] === to.id && id === from.id)));
            return <g key={road.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={used ? "#d0b17a" : "#76848d"} strokeWidth={used ? 5 : 3}/><text className="road-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12}>{distance.format(road.meters / 1000)} km</text></g>;
          })}
          {graph.locations.map(point => <g key={point.id} data-map-node role="button" tabIndex={0} aria-label={`Legg til ${point.name} i ruten`} aria-disabled={!canAppend(point.id)} onClick={() => append(point.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); append(point.id); } }} className="map-node">
            <circle cx={point.x} cy={point.y} r="12" fill={path.includes(point.id) ? "#d0b17a" : "#1a252d"} stroke="#d0b17a" strokeWidth="3"/><text x={point.x + 20} y={point.y + 5}>{point.name}</text>
          </g>)}
        </g>
      </svg><p className="map-caption">Dra for å flytte kartet. Velg steder i rekkefølge, eller bruk knappene nedenfor.</p>
      <div className="map-location-list">{graph.locations.map(point => <button key={point.id} disabled={!canAppend(point.id)} onClick={() => append(point.id)}>{point.name}</button>)}</div>
      {last && <p className="map-caption">{graph.locations.find(point => point.id === last)?.description}</p>}
      {graph.locations.length === 0 && <p>Ingen steder er tilgjengelige.</p>}
    </section><section className="route-panel" aria-label="Ruteplanlegger">
      <p className="eyebrow">PRØV EN RUTE</p><h2>Avstand og tid</h2><p>Ruten er din hypotese. Den viser ikke bekreftede bevegelser.</p>
      {path.length === 0 ? <p>Velg et startsted på kartet.</p> : <ol className="route-stops">{path.map((id, index) => <li key={`${id}-${index}`}>{graph.locations.find(point => point.id === id)?.name}</li>)}</ol>}
      <div className="document-toolbar"><button disabled={path.length === 0} onClick={() => setPath(current => current.slice(0, -1))}>Angre siste sted</button><button disabled={path.length === 0} onClick={() => setPath([])}>Tøm ruten</button></div>
      <fieldset><legend>Reisemåte</legend><label><input type="radio" name="mode" checked={mode === "walk"} onChange={() => setMode("walk")}/> Til fots</label><label><input type="radio" name="mode" checked={mode === "drive"} onChange={() => setMode("drive")}/> Bil i vinterføre</label></fieldset>
      <label className="route-input">Tid til stopp, minutter<input type="number" min="0" max="180" value={stops} onChange={event => setStops(Math.max(0, Math.min(180, Math.trunc(Number(event.target.value) || 0))))}/></label>
      <label className="route-input">Tilgjengelig tidsrom, minutter<input type="number" min="0" max="1440" value={available} onChange={event => setAvailable(event.target.value)} placeholder="Valgfritt"/></label>
      <div className="route-result" aria-live="polite">
        {path.length >= 2 && route.isPending && <p>Beregner ruten …</p>}
        {path.length >= 2 && route.isError && <><p>Kunne ikke beregne ruten.</p><button onClick={() => { void route.refetch(); }}>Prøv igjen</button></>}
        {estimate && <><strong>{distance.format(estimate.meters / 1000)} km</strong><p>{min}–{max} minutter{stops > 0 ? `, inkludert ${stops} minutter til stopp` : ""}</p>{message && <p>{message}</p>}</>}
      </div>
      <p className="map-caption">Tidsanslagene er intervaller for denne fiktive modellen, ikke fasitsvar om hvor noen var.</p>
    </section></div>
  </>;
}
