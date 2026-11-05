import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { emptyRoute, useTheoryStore } from "../reconstruction/theoryStore";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { compareWindow, estimateRoute, isMapGraph, type MapGraph } from "./api";
import { MapCanvas } from "./MapCanvas";
import "./map.css";
import { formatTime, isTimeline, resolveTimeWindow, type TimelineEvent } from "../timeline/api";

export function MapPage() {
  const { caseId = "" } = useParams();
  const [search] = useSearchParams();
  const timeIds = search.getAll("timeCard");
  const timeKey = JSON.stringify([caseId, timeIds]);
  const timeline = useQuery({ queryKey:["cases", caseId, "timeline"], enabled:timeIds.length > 0,
    queryFn:({ signal }) => fetchJson<TimelineEvent[]>(`/api/cases/${encodeURIComponent(caseId)}/timeline`, signal, isTimeline) });
  const imported = timeline.isSuccess ? resolveTimeWindow(timeIds, timeline.data) : null;
  const query = useQuery({ queryKey:["cases", caseId, "map"], queryFn:({ signal }) => fetchJson<MapGraph>(`/api/cases/${encodeURIComponent(caseId)}/map`, signal, isMapGraph) });
  const timelineSearch = new URLSearchParams();
  imported?.events.forEach(event => timelineSearch.append("timeCard", event.id));
  const timelineLink = imported ? `../timeline?${timelineSearch}` : "../timeline";
  const path = useTheoryStore(state => state.routes[caseId] ?? emptyRoute);
  const setRoute = useTheoryStore(state => state.setRoute);
  const setPath = (next:string[]) => setRoute(caseId, next);
  const [step, setStep] = useState<"route" | "time">(() => timeIds.length ? "time" : "route");
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<"walk" | "drive">("walk");
  const [stops, setStops] = useState(0);
  const [manualWindow, setManualWindow] = useState<{ key:string; value:string }>();
  const overridden = manualWindow?.key === timeKey;
  const available = overridden ? manualWindow.value : imported ? String(imported.minutes) : "";
  const route = useQuery({ queryKey:["cases", caseId, "route", path], enabled:query.isSuccess && path.length >= 2,
    queryFn:({ signal }) => estimateRoute(caseId, path, signal) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const graph = query.data;
  const last = path.at(-1);
  const canAppend = (id:string) => path.length < 24 && (!last || graph.roads.some(road => road.fromLocationId === last && road.toLocationId === id || road.toLocationId === last && road.fromLocationId === id));
  const append = (id:string) => { if (canAppend(id)) setPath([...path, id]); };
  const distance = new Intl.NumberFormat("nb-NO", { maximumFractionDigits:2 });
  const estimate = path.length >= 2 && route.isSuccess ? route.data : undefined;
  const min = estimate ? (mode === "walk" ? estimate.walkMinutesMin : estimate.driveMinutesMin) + stops : 0;
  const max = estimate ? (mode === "walk" ? estimate.walkMinutesMax : estimate.driveMinutesMax) + stops : 0;
  const message = estimate ? compareWindow(min, max, available === "" ? null : Number(available)) : "";
  const count = Math.max(1, Math.ceil(graph.locations.length / 4));
  const current = Math.min(page, count - 1);
  return <section className="route-stage" aria-label="Ruteverksted"><header className="route-heading"><div><p className="eyebrow">STED · REKKEFØLGE · MULIGHET</p><h1>Kart</h1></div><p>Skardal er fiktivt. Kartet er skjematisk; avstandene gjelder veinettet.</p><Link to={timelineLink}>Undersøk tidspunktene ↗</Link></header>
    <div className="route-workspace"><MapCanvas graph={graph} path={path} append={append} canAppend={canAppend}/>
      <section className="route-console" aria-label="Ruteplanlegger"><nav className="route-steps" aria-label="Arbeid med ruten"><button aria-pressed={step === "route"} onClick={() => setStep("route")}>1 · Velg steder</button><button aria-pressed={step === "time"} onClick={() => setStep("time")}>2 · Prøv tidsrommet</button></nav>
        <div className="route-console-scroll" tabIndex={0} role="region" aria-label={step === "route" ? "Stedsvalg og ruterekkefølge" : "Forutsetninger for tidsanslaget"}>
        {step === "route" ? <><p className="eyebrow">DIN RUTEHYPOTESE</p><h2>{path.length ? "Hvor går ruten videre?" : "Velg et startsted"}</h2><p>Legg til sammenhengende steder i den rekkefølgen du vil undersøke.</p>
          <div className="route-location-cards">{graph.locations.slice(current * 4, current * 4 + 4).map(point => <button key={point.id} disabled={!canAppend(point.id)} onClick={() => append(point.id)}><span aria-hidden="true">{path.includes(point.id) ? "◉" : "○"}</span><strong>{point.name}</strong><span aria-hidden="true">+</span></button>)}</div>
          {!graph.locations.length && <p>Ingen steder er tilgjengelige.</p>}
          {count > 1 && <div className="route-place-pagination"><button aria-label="Forrige steder" disabled={!current} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {count}</span><button aria-label="Neste steder" disabled={current >= count - 1} onClick={() => setPage(current + 1)}>→</button></div>}
          {last && <p className="route-place-description">{graph.locations.find(point => point.id === last)?.description ?? "Et sted i utkastet er ikke tilgjengelig. Angre siste sted eller tøm utkastet."}</p>}
          <ol className="route-draft-stops" aria-label="Valgt ruterekkefølge">{path.map((id, index) => <li key={`${id}-${index}`}><span>{index + 1}</span>{graph.locations.find(point => point.id === id)?.name ?? "Utilgjengelig sted"}</li>)}</ol>
        </> : <><p className="eyebrow">PRØV FORUTSETNINGENE</p><h2>Rekker ruten frem?</h2><p>Et mulig tidsanslag bekrefter ikke at reisen fant sted.</p><fieldset><legend>Reisemåte</legend><label><input type="radio" name="mode" checked={mode === "walk"} onChange={() => setMode("walk")}/> Til fots</label><label><input type="radio" name="mode" checked={mode === "drive"} onChange={() => setMode("drive")}/> Bil i vinterføre</label></fieldset>
          <label className="route-input">Tid til stopp, minutter<input type="number" min="0" max="180" value={stops} onChange={event => setStops(Math.max(0, Math.min(180, Math.trunc(Number(event.target.value) || 0))))}/></label>
          {timeIds.length > 0 && <section className="route-time-source" aria-label="Tidsrom fra tidslinjen">
            {timeline.isPending && <p role="status">Henter de valgte tidskortene …</p>}
            {timeline.isError && <><p role="alert">Kunne ikke hente tidskortene. Du kan fortsatt prøve ruten med et eget tidsrom.</p><button onClick={() => void timeline.refetch()}>Hent tidskortene igjen</button></>}
            {timeline.isSuccess && !imported && <p>De valgte tidskortene er ikke tilgjengelige for beregning. Velg to tidsfestede kort i tidslinjen, eller angi et eget tidsrom.</p>}
            {imported && <><p><strong>{imported.minutes} minutter mellom tidskortene</strong></p>{imported.events.map(item => <p key={item.id}>{item.isEstimate ? "ca. " : ""}{formatTime(item.minuteOfDay)} · {item.title}{item.isPlanned ? " (planlagt)" : ""}{item.sourceEvidenceId && <> · <Link to={`../evidence/${encodeURIComponent(item.sourceEvidenceId)}`}>Åpne kilde<span className="sr-only"> for {item.title}</span></Link></>}</p>)}
              <p>{imported.events.some(item => item.isEstimate) && "Minst ett tidspunkt er omtrentlig. "}Tidskortene bekrefter ikke at en reise fant sted mellom hendelsene.</p>
              {overridden && <><p>Tidsrommet er endret manuelt.</p><button onClick={() => setManualWindow(undefined)}>Bruk tidskortene igjen</button></>}
            </>}
          </section>}
          <label className="route-input">Tilgjengelig tidsrom, minutter<input type="number" min="0" max="1440" value={available} onChange={event => setManualWindow({ key:timeKey, value:event.target.value === "" ? "" : String(Math.max(0, Math.min(1440, Math.trunc(Number(event.target.value) || 0)))) })} placeholder="Valgfritt"/></label>
          <p className="route-assumption-note">Tidsanslagene er intervaller i denne fiktive modellen. Tid til stopp legges til begge grensene. Ruteutkastet beholdes på denne enheten. Valgte tidskort følger lenken; egne tidsrom, reisemåte og tid til stopp nullstilles når du forlater kartet.</p>
        </>}
        </div>
        <div className="route-edit-actions"><button disabled={!path.length} onClick={() => setPath(path.slice(0, -1))}>Angre siste sted</button><button disabled={!path.length} onClick={() => setPath([])}>Tøm ruten</button></div>
      </section>
    </div>
    <section className="route-verdict" aria-label="Ruteberegning"><div className="route-result" aria-live="polite">
      {path.length < 2 && <><strong>Hvor kan ruten gå?</strong><p>Velg minst to steder for å beregne avstand og tid.</p></>}
      {path.length >= 2 && route.isPending && <p>Beregner ruten …</p>}
      {path.length >= 2 && route.isError && <><p>Kunne ikke beregne ruten. Utkastet ditt er beholdt.</p><button onClick={() => { void route.refetch(); }}>Prøv igjen</button></>}
      {estimate && <><strong>{distance.format(estimate.meters / 1000)} km</strong><span className="route-duration">{min}–{max} minutter{stops > 0 ? `, inkludert ${stops} minutter til stopp` : ""}</span><p>{message || "Ruten er din hypotese. Den viser ikke bekreftede bevegelser."}</p></>}
    </div><div className="route-next-actions">{step === "route" && path.length >= 2 && <button onClick={() => setStep("time")}>Prøv tidsrommet ↗</button>}{estimate && <Link to="../reconstruction">Bruk ruten i rekonstruksjonen ↗</Link>}</div></section>
  </section>;
}
