import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { elapsedMinutes, formatTime, isTimeline, type TimelineEvent } from "./api";

export function TimelinePage() {
  const { caseId = "" } = useParams();
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({ queryKey: ["cases", caseId, "timeline"], queryFn: ({ signal }) => fetchJson<TimelineEvent[]>(`/api/cases/${encodeURIComponent(caseId)}/timeline`, signal, isTimeline) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const pair = selected.map(id => query.data.find(item => item.id === id)).filter((item): item is TimelineEvent => item !== undefined);
  const difference = pair.length === 2 ? elapsedMinutes(pair[0], pair[1]) : null;
  return <>
    <div className="overview-heading"><p className="eyebrow">18. DESEMBER 1999</p><h1>Tidslinje</h1><p>Velg to tidsfestede oppføringer for å sammenligne tidsrommet. En plan er ikke en bekreftet hendelse.</p></div>
    <section className="time-comparison" aria-live="polite"><h2>{difference === null ? "Sammenlign to tidspunkter" : `${difference} minutter mellom oppføringene`}</h2>
      {pair.map(item => <p key={item.id}>{formatTime(item.minuteOfDay)} — {item.title}{item.isEstimate ? " (omtrentlig)" : ""}{item.isPlanned ? " (planlagt)" : ""}</p>)}
      {difference !== null && <p>Avstanden i tid bekrefter ikke hva som skjedde i mellomtiden.</p>}
    </section>
    {query.data.length === 0 ? <p>Ingen hendelser er registrert.</p> : <ol className="timeline-list">{query.data.map(item => <li key={item.id} className={item.minuteOfDay === null ? "timeline-gap" : ""}>
      <div className="timeline-time"><strong>{item.isEstimate ? "ca. " : ""}{formatTime(item.minuteOfDay)}</strong><small>{item.isPlanned ? "Planlagt" : item.minuteOfDay === null ? "Uavklart" : "Arkivopplysning"}</small></div>
      <article><h2>{item.title}</h2><p>{item.description}</p><div className="timeline-actions">
        {item.minuteOfDay !== null && <button aria-pressed={selected.includes(item.id)} onClick={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current.slice(-1), item.id])}>{selected.includes(item.id) ? "Valgt" : "Sammenlign"}<span className="sr-only"> {item.title}</span></button>}
        {item.sourceEvidenceId && <Link to={`../evidence/${encodeURIComponent(item.sourceEvidenceId)}`}>Åpne kilde <span className="sr-only">for {item.title}</span> ↗</Link>}
      </div></article>
    </li>)}</ol>}
  </>;
}
