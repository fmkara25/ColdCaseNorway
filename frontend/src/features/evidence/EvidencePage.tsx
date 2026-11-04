import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { useReviewStore } from "../investigation/reviewStore";
import { isEvidenceList, type Evidence } from "./api";

export function EvidencePage() {
  const { caseId = "", evidenceId } = useParams();
  const query = useQuery({ queryKey: ["cases", caseId, "evidence"], queryFn: ({ signal }) => fetchJson<Evidence[]>(`/api/cases/${encodeURIComponent(caseId)}/evidence`, signal, isEvidenceList) });
  const reviewed = useReviewStore(state => state.reviewed[caseId]);
  const markReviewed = useReviewStore(state => state.markReviewed);
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(100);
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const selected = query.data.find(item => item.id === evidenceId);
  return <>
    <div className="overview-heading"><p className="eyebrow">KILDEMATERIALE</p><h1>Bevis</h1><p>Les kildene nøye. Skill mellom dokumenterte opplysninger og det noen har forklart.</p></div>
    <div className="people-workspace"><section className="people-list" aria-label="Bevisregister">
      {query.data.length === 0 && <p>Ingen dokumenter er tilgjengelige.</p>}
      {query.data.map(item => <Link className="person-card" aria-current={item.id === evidenceId ? "page" : undefined} key={item.id} to={`../evidence/${encodeURIComponent(item.id)}`}>
        <span><strong>{item.title}</strong><small>{item.kind} · {reviewed?.includes(item.id) ? "Gjennomgått" : "Ikke gjennomgått"}</small></span><span aria-hidden="true">↗</span>
      </Link>)}
    </section><section aria-label="Dokumentvisning">
      {selected ? <>
        <div className="document-toolbar"><button onClick={() => { setZoom(100); dialog.current?.showModal(); }}>Forstørr dokument</button>
          <button disabled={reviewed?.includes(selected.id)} onClick={() => markReviewed(caseId, selected.id)}>{reviewed?.includes(selected.id) ? "Gjennomgått" : "Marker som gjennomgått"}</button></div>
        <Document evidence={selected} />
        <dialog ref={dialog} className="document-dialog" aria-label="Forstørret dokument">
          <div className="document-toolbar"><button onClick={() => setZoom(value => Math.max(80, value - 20))} disabled={zoom <= 80} aria-label="Mindre tekst">A−</button><span>{zoom} %</span><button onClick={() => setZoom(value => Math.min(180, value + 20))} disabled={zoom >= 180} aria-label="Større tekst">A+</button><button onClick={() => dialog.current?.close()}>Lukk</button></div>
          <div style={{ fontSize: `${zoom}%` }}><Document evidence={selected} /></div>
        </dialog>
      </> : <div className="person-detail"><h2>{evidenceId ? "Dokumentet er ikke tilgjengelig i denne saken." : "Velg et dokument"}</h2><p>Kildene åpnes her. Du kan forstørre teksten og markere hva du har gjennomgått.</p></div>}
    </section></div>
  </>;
}
function Document({ evidence }: { evidence: Evidence }) {
  return <article className="report evidence-document"><div className="report-meta"><span>{evidence.kind}</span><span>ARKIVUTDRAG</span></div><h2>{evidence.title}</h2><p className="document-source">{evidence.source}</p><div className="document-body">{evidence.body}</div><hr/><p className="report-note">Gjengitt som lesbart arkivutdrag. Vurder opplysningene sammen med andre kilder.</p></article>;
}
