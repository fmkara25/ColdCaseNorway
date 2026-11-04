import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { elapsedMinutes, formatTime, isTimeline, type TimelineEvent } from "./api";
import "./timeline.css";

export function TimelinePage() {
  const { caseId = "" } = useParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [focused, setFocused] = useState<string>();
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ["cases", caseId, "timeline"], queryFn: ({ signal }) => fetchJson<TimelineEvent[]>(`/api/cases/${encodeURIComponent(caseId)}/timeline`, signal, isTimeline) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const events = query.data;
  const pair = selected.map(id => events.find(item => item.id === id)).filter((item): item is TimelineEvent => item !== undefined);
  const difference = pair.length === 2 ? elapsedMinutes(pair[0], pair[1]) : null;
  const active = events.find(item => item.id === focused);
  const count = Math.max(1, Math.ceil(events.length / 6));
  const current = Math.min(page, count - 1);
  const sourceRoot = `/cases/${encodeURIComponent(caseId)}/evidence/`;
  const comparison = pair.length === 2 && pair[0].sourceEvidenceId && pair[1].sourceEvidenceId && pair[0].sourceEvidenceId !== pair[1].sourceEvidenceId
    ? `${sourceRoot}${encodeURIComponent(pair[0].sourceEvidenceId)}?compare=1&with=${encodeURIComponent(`evidence:${pair[1].sourceEvidenceId}`)}` : null;
  function choose(item:TimelineEvent) {
    setFocused(item.id);
    if (item.minuteOfDay !== null) setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current.slice(-1), item.id]);
  }
  return <section className="chronology-stage" aria-label="Tidsverksted"><header className="chronology-heading"><div><p className="eyebrow">REKKEFØLGE · TIDSROM · USIKKERHET</p><h1>Tidslinje</h1></div><p>Velg to tidsfestede kort. Undersøk hva kildene faktisk sier.</p><div className="chronology-pagination"><button aria-label="Forrige tidskort" disabled={!current} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {count}</span><button aria-label="Neste tidskort" disabled={current >= count - 1} onClick={() => setPage(current + 1)}>→</button></div></header>
    <ol className="chronology-cards" aria-label="Tilgjengelige tidsoppføringer">{events.slice(current * 6, current * 6 + 6).map(item => <li key={item.id}><button className={`chronology-card ${item.isPlanned ? "planned" : item.minuteOfDay === null ? "unknown" : ""}`} aria-pressed={item.minuteOfDay !== null ? selected.includes(item.id) : undefined} aria-label={`${item.minuteOfDay === null ? "Undersøk" : "Sammenlign"} ${item.title}`} onClick={() => choose(item)}>
      <span className="chronology-stamp">{item.isPlanned ? "PLANLAGT" : item.minuteOfDay === null ? "UAVKLART" : item.isEstimate ? "OMTRENTLIG" : "ARKIVOPPLYSNING"}</span><strong>{item.isEstimate ? "ca. " : ""}{formatTime(item.minuteOfDay)}</strong><span className="chronology-card-title">{item.title}</span><span className="chronology-marker" aria-hidden="true">{selected.includes(item.id) ? "✓" : "+"}</span>
    </button></li>)}</ol>
    {!events.length && <p>Ingen hendelser er registrert.</p>}
    <section className="chronology-inspection" aria-label="Valgt tidsoppføring">{active ? <><div className="chronology-paper" tabIndex={0} role="region" aria-label="Opplysninger i tidskortet"><p className="eyebrow">{active.isPlanned ? "EN PLAN ER IKKE EN BEKREFTET HENDELSE" : active.minuteOfDay === null ? "INGEN FASTSATT KLOKKESLETT" : "VURDER KILDENS PRESISJON"}</p><h2>{active.title}</h2><p>{active.description}</p></div><div className="chronology-source"><span className="chronology-large-time">{active.isEstimate ? "ca. " : ""}{formatTime(active.minuteOfDay)}</span><p>{active.isEstimate ? "Tidspunktet er et anslag." : active.isPlanned ? "Planlagt avgang viser ikke at reisen fant sted." : active.minuteOfDay === null ? "Ukjent tid brukes ikke som nullpunkt i beregningen." : "Et registrert tidspunkt forteller ikke alt om hendelsen."}</p>{active.sourceEvidenceId && <Link to={`${sourceRoot}${encodeURIComponent(active.sourceEvidenceId)}`}>Åpne kilde <span className="sr-only">for {active.title}</span> ↗</Link>}</div></> : <div className="chronology-empty"><span aria-hidden="true">◷</span><h2>Hvor oppstår tidsrommet?</h2><p>Velg et kort for å åpne opplysningene. Et tredje tidsfestet kort erstatter det første i sammenligningen.</p></div>}</section>
    <section className="chronology-comparison" aria-label="Sammenligning av tid" aria-live="polite"><div><p className="eyebrow">DIN SAMMENLIGNING</p><h2>{difference === null ? "Sammenlign to tidspunkter" : `${difference} minutter mellom oppføringene`}</h2><div className="chronology-receipts">{pair.map(item => <button key={item.id} aria-label={`Fjern ${item.title} fra sammenligningen`} onClick={() => setSelected(current => current.filter(id => id !== item.id))}>{item.isEstimate ? "ca. " : ""}{formatTime(item.minuteOfDay)} · {item.title}{item.isPlanned ? " (planlagt)" : ""} ×</button>)}</div></div><div className="chronology-next">{difference !== null ? <><p>{pair.some(item => item.isEstimate) && "Minst ett tidspunkt er omtrentlig. "}Avstanden i tid bekrefter ikke hva som skjedde i mellomtiden.</p>{comparison && <Link to={comparison}>Legg kildene ved siden av hverandre ↗</Link>}</> : <p>{pair.length ? "Velg ett tidsfestet kort til." : "Kort uten klokkeslett kan undersøkes, men ikke brukes til å beregne tidsrom."}</p>}</div></section>
  </section>;
}
