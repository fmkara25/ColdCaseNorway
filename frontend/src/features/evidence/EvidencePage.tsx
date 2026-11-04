import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { progressCommand, useProgress } from "../investigation/progress";
import { usePaperSound } from "../atmosphere/context";
import { isEvidenceList, type Evidence } from "./api";
import { SourcePanel } from "./SourcePanel";
import { comparisonSources } from "./comparisonSources";
import { ComparisonStage } from "./ComparisonStage";
import "./evidence.css";

export function EvidencePage() {
  const { caseId = "", evidenceId } = useParams();
  const query = useQuery({ queryKey:["cases", caseId, "evidence"], queryFn: ({ signal }) => fetchJson<Evidence[]>(`/api/cases/${encodeURIComponent(caseId)}/evidence`, signal, isEvidenceList) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  if (!evidenceId) return <EvidenceGallery caseId={caseId} evidence={query.data} />;
  const selected = query.data.find(item => item.id === evidenceId);
  return selected ? <EvidenceReader key={`${caseId}:${evidenceId}`} caseId={caseId} selected={selected} evidence={query.data} /> : <section className="evidence-stage unavailable-source"><h1>Dokumentet er ikke tilgjengelig i denne saken.</h1><Link to="../evidence">Til dokumentene</Link></section>;
}
function EvidenceGallery({ caseId, evidence }: { caseId:string; evidence:Evidence[] }) {
  const [page, setPage] = useState(0);
  const progress = useProgress(caseId);
  const paper = usePaperSound();
  const count = Math.max(1, Math.ceil(evidence.length / 6));
  const current = Math.min(page, count - 1);
  return <section className="evidence-stage" aria-label="Bevisregister"><header className="evidence-stage-heading"><div><p className="eyebrow">GÅ TILBAKE TIL KILDENE</p><h1>Bevis</h1></div><p>Åpne et dokument. Undersøk det alene eller sammen med en annen kilde.</p></header>
    <div className="evidence-deck">{evidence.slice(current * 6, current * 6 + 6).map(item => <Link className="evidence-file-card" key={item.id} to={`../evidence/${encodeURIComponent(item.id)}`} onClick={paper} aria-label={item.title}>
      <span>{item.kind}</span><strong>{item.title}</strong><p>{item.body.split("\n").slice(0, 3).join("\n")}</p><small>{progress.data?.reviewedEvidenceIds.includes(item.id) ? "Tatt med i vurderingen" : "Åpne og undersøk"} ↗</small>
    </Link>)}{evidence.length === 0 && <p>Ingen dokumenter er tilgjengelige.</p>}</div>
    <div className="evidence-pagination"><button aria-label="Forrige dokumenter" disabled={!current} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {count}</span><button aria-label="Neste dokumenter" disabled={current >= count - 1} onClick={() => setPage(current + 1)}>→</button></div>
  </section>;
}
function EvidenceReader({ caseId, selected, evidence }: { caseId:string; selected:Evidence; evidence:Evidence[] }) {
  const [search] = useSearchParams();
  const client = useQueryClient();
  const progress = useProgress(caseId);
  const paper = usePaperSound();
  const [zoom, setZoom] = useState(100);
  const [newQuestions, setNewQuestions] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewed = progress.data?.reviewedEvidenceIds.includes(selected.id) ?? false;
  const source = comparisonSources([selected], [])[0];
  const root = `/cases/${encodeURIComponent(caseId)}`;
  const review = useMutation({ mutationFn: () => progressCommand(caseId, `evidence/${encodeURIComponent(selected.id)}/review`), onSuccess: async value => {
    const before = new Set(progress.data?.actions.map(action => action.id));
    client.setQueryData(["progress", caseId], value);
    setNewQuestions(value.actions.some(action => !before.has(action.id)));
    await client.invalidateQueries({ queryKey:["investigation", caseId] });
  } });
  if (search.has("compare")) return <ComparisonStage key={search.get("with") ?? "picker"} caseId={caseId} primary={selected} evidence={evidence} />;
  return <section className="evidence-stage evidence-reader-stage"><header className="evidence-stage-heading"><div><p className="eyebrow">UNDERSØK OPPLYSNINGENE</p><h1>Bevis</h1></div><Link className="quiet-game-link" to="../evidence">← Dokumentene</Link></header>
    <div className="evidence-reader-layout"><SourcePanel item={source} label="Dokumentvisning" /><section className="evidence-decisions" aria-label="Bruk kilden videre"><p className="eyebrow">DITT NESTE TREKK</p><h2>Hva vil du følge opp?</h2>
      <button className="decision-card" aria-label={reviewed ? "Tatt med i vurderingen" : "Ta med i vurderingen"} disabled={!progress.isSuccess || review.isPending || reviewed} onClick={() => review.mutate()}><strong>{reviewed ? "Tatt med i vurderingen" : review.isPending ? "Registrerer …" : "Ta med i vurderingen"}</strong><small>Kilden kan danne grunnlag for nye spørsmål</small></button>
      <Link className="decision-card" to="?compare=1"><strong>Sammenlign med en kilde</strong><small>Legg to kilder ved siden av hverandre</small></Link>
      <button className="decision-card" onClick={() => { paper(); setZoom(100); dialog.current?.showModal(); }}><strong>Forstørr dokument</strong><small>Les arkivutdraget i større format</small></button>
      {newQuestions && <Link className="source-followup" to={root}>Nye spørsmål er tilgjengelige. Følg opp ved bordet ↗</Link>}
      {(progress.isError || review.isError) && <div role="alert"><p>{review.error?.message ?? "Kunne ikke hente lagringen."}</p><button onClick={() => { review.reset(); void progress.refetch(); }}>Oppdater opplysningene</button></div>}
    </section></div>
    <dialog ref={dialog} className="desk-dialog enlarged-source" aria-label="Forstørret dokument"><header className="desk-dialog-header"><div className="source-zoom"><button disabled={zoom <= 80} aria-label="Mindre tekst" onClick={() => setZoom(value => value - 20)}>A−</button><span>{zoom} %</span><button disabled={zoom >= 180} aria-label="Større tekst" onClick={() => setZoom(value => value + 20)}>A+</button></div><button onClick={() => dialog.current?.close()}>Lukk</button></header><SourcePanel item={source} label="Forstørret kilde" zoom={zoom}/></dialog>
  </section>;
}
