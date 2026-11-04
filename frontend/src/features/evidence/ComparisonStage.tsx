import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import { ArchiveImage } from "../../components/ArchiveImage";
import { fetchJson } from "../cases/api";
import { isPeople, type Person } from "../people/api";
import { readBoard, saveBoard, type BoardSnapshot } from "../board/api";
import { progressCommand, useProgress, type CaseAction } from "../investigation/progress";
import { addComparison } from "./comparison";
import { SourcePanel } from "./SourcePanel";
import { comparisonSources, type ComparisonSource } from "./comparisonSources";
import type { Evidence } from "./api";

export function ComparisonStage({ caseId, primary, evidence }: { caseId:string; primary:Evidence; evidence:Evidence[] }) {
  const [search, setSearch] = useSearchParams();
  const client = useQueryClient();
  const root = `/cases/${encodeURIComponent(caseId)}`;
  const progress = useProgress(caseId);
  const people = useQuery({ queryKey:["cases", caseId, "people"], queryFn: ({ signal }) => fetchJson<Person[]>(`/api${root}/people`, signal, isPeople) });
  const board = useQuery({ queryKey:["investigation", caseId], queryFn: ({ signal }) => readBoard(caseId, signal), enabled:progress.isSuccess,
    staleTime:0, refetchOnMount:"always", refetchOnWindowFocus:false });
  const sources = comparisonSources(evidence, people.data ?? []);
  const from = sources.find(item => item.id === `evidence:${primary.id}`)!;
  const targetId = search.get("with");
  const target = sources.find(item => item.id === targetId && item.id !== from.id);
  const [label, setLabel] = useState("");
  const [zoom, setZoom] = useState(100);
  const [saved, setSaved] = useState(false);
  const [topics, setTopics] = useState<CaseAction[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const leave = useRef<HTMLDialogElement>(null);
  const dirty = label.length > 0 && !saved;
  const blocker = useBlocker(dirty);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (targetId) right.current?.querySelector("h2")?.focus({ preventScroll:true }); }, [targetId]);
  useEffect(() => {
    if (blocker.state === "blocked" && !dirty) { blocker.proceed(); return; }
    if (blocker.state === "blocked" && !leave.current?.open) leave.current?.showModal();
    if (blocker.state !== "blocked" && leave.current?.open) leave.current?.close();
  }, [blocker, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event:BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const review = useMutation({ mutationFn:(id:string) => progressCommand(caseId, `evidence/${encodeURIComponent(id)}/review`), onSuccess:async value => {
    client.setQueryData(["progress", caseId], value);
    await client.invalidateQueries({ queryKey:["investigation", caseId] });
  } });
  const write = useMutation({ mutationFn:async (snapshot:BoardSnapshot) => {
    if (!target) throw new Error("Velg en tilgjengelig kilde først.");
    const next = addComparison(snapshot, from.id, target.id, label, new Set(sources.map(item => item.id)), crypto.randomUUID());
    return saveBoard(caseId, next);
  }, onSuccess:async value => {
    const before = new Set(progress.data?.actions.map(item => item.id));
    client.setQueryData(["investigation", caseId], value); setSaved(true);
    const fresh = await progress.refetch();
    setTopics(fresh.data?.actions.filter(item => !before.has(item.id)) ?? []);
  } });
  const existing = target && board.data?.board.connections.find(item => item.fromId === from.id && item.toId === target.id || item.fromId === target.id && item.toId === from.id);
  const busy = write.isPending || review.isPending;
  const reviewed = progress.data?.reviewedEvidenceIds ?? [];
  function reviewSource(item:ComparisonSource) { if (item.evidence) { review.reset(); review.mutate(item.evidence.id); } }
  return <section className="evidence-stage comparison-stage" aria-label="Sammenligningsbord"><header className="evidence-stage-heading"><div><p className="eyebrow">TO KILDER · DIN VURDERING</p><h1 ref={heading} tabIndex={-1}>Sammenlign kildene</h1></div><div className="comparison-header-actions"><div className="source-zoom"><button aria-label="Mindre sammenligningstekst" disabled={zoom <= 100} onClick={() => setZoom(value => value - 20)}>A−</button><span>{zoom} %</span><button aria-label="Større sammenligningstekst" disabled={zoom >= 180} onClick={() => setZoom(value => value + 20)}>A+</button></div><Link className="quiet-game-link" to={`${root}/evidence/${encodeURIComponent(primary.id)}`}>← Til dokumentet</Link></div></header>
    <div className="comparison-papers"><SourcePanel item={from} zoom={zoom} label="Første kilde" review={() => reviewSource(from)} reviewed={reviewed.includes(primary.id)} busy={busy || !progress.isSuccess} />
      <div className="comparison-right" ref={right}>{target ? <SourcePanel item={target} zoom={zoom} label="Andre kilde" review={target.evidence ? () => reviewSource(target) : undefined} reviewed={!!target.evidence && reviewed.includes(target.evidence.id)} busy={busy || !progress.isSuccess} /> : people.isPending ? <p role="status">Henter tilgjengelige kilder …</p> : people.isError ? <div role="alert"><p>Kunne ikke hente personopplysningene.</p><button onClick={() => { void people.refetch(); }}>Prøv igjen</button></div> : <>
        {targetId && <p role="status">Den valgte kilden er ikke tilgjengelig her. Velg blant kildene nedenfor.</p>}
        <SourcePicker sources={sources.filter(item => item.id !== from.id)} choose={id => setSearch({ compare:"1", with:id })} />
      </>}</div>
    </div>
    <section className="comparison-composer" aria-label="Din hypotese"><div><p className="eyebrow">FORBINDELSE, IKKE BEVIS</p><h2>Hva bør undersøkes sammen?</h2>{target && <button className="change-source" disabled={busy} onClick={() => setSearch({ compare:"1" })}>Bytt den andre kilden</button>}</div>
      <div className="hypothesis-controls"><label htmlFor="comparison-label">Beskriv forbindelsen <span>maks. 120 tegn</span></label><input id="comparison-label" maxLength={120} value={label} disabled={!target || busy || !!existing} onChange={event => { setLabel(event.target.value); setSaved(false); write.reset(); }} placeholder="Hva trenger en forklaring?" />
        <div className="comparison-actions"><button disabled={!target || !label.trim() || !board.isSuccess || board.isFetching || busy || !!existing} onClick={() => { if (board.data) { write.reset(); write.mutate(board.data); } }}>{write.isPending ? "Lagrer …" : "Lagre koblingen på tavlen"}</button><Link to={`${root}/board`}>Åpne tavlen ↗</Link></div>
      </div>
      {(board.isPending || board.isFetching) && <p className="comparison-status" role="status">Henter tavlen …</p>}
      {(board.isError || write.isError || review.isError || progress.isError) && <div className="comparison-status" role="alert"><p>{write.error?.message ?? review.error?.message ?? "Kunne ikke hente den nyeste lagringen. Teksten din er beholdt."}</p><button disabled={busy} onClick={() => { write.reset(); review.reset(); void board.refetch(); void progress.refetch(); }}>Hent nyeste tavle</button></div>}
      {existing && <div className="comparison-status" role="status"><p>{saved ? "Koblingen er lagret som din hypotese: " : "Kildene er allerede koblet på tavlen: "}{existing.label}</p>{dirty && <p>Din ulagrede tekst er beholdt: {label}</p>}</div>}
      {topics.length > 0 && <div className="comparison-followups"><span>Spørsmål som nå kan følges opp:</span>{topics.map(topic => <Link key={topic.id} to={topic.personId ? `${root}/people/${encodeURIComponent(topic.personId)}` : root}>{topic.label} ↗</Link>)}</div>}
    </section>
    <dialog className="document-dialog" ref={leave} aria-label="Ulagret sammenligning" onCancel={event => { event.preventDefault(); if (blocker.state === "blocked") blocker.reset(); }}><h2>Du har en ulagret hypotese</h2><p>Teksten er ikke lagret på tavlen. Fortsett å redigere, eller forlat sammenligningen uten å lagre.</p><div className="document-toolbar"><button onClick={() => { if (blocker.state === "blocked") blocker.reset(); }}>Fortsett å redigere</button><button onClick={() => { if (blocker.state === "blocked") blocker.proceed(); }}>Forlat uten å lagre</button></div></dialog>
  </section>;
}
function SourcePicker({ sources, choose }: { sources:ComparisonSource[]; choose:(id:string) => void }) {
  const [kind, setKind] = useState<"evidence" | "person">("evidence");
  const [page, setPage] = useState(0);
  const filtered = sources.filter(item => kind === "evidence" ? !!item.evidence : !!item.person);
  const count = Math.max(1, Math.ceil(filtered.length / 4));
  const current = Math.min(page, count - 1);
  return <section className="comparison-picker" aria-label="Velg andre kilde"><h2>Hva vil du legge ved siden av?</h2><div className="source-filters"><button aria-pressed={kind === "evidence"} onClick={() => { setKind("evidence"); setPage(0); }}>Dokumenter</button><button aria-pressed={kind === "person"} onClick={() => { setKind("person"); setPage(0); }}>Personer</button></div>
    <div className="comparison-candidates">{filtered.slice(current * 4, current * 4 + 4).map(item => <button className="comparison-candidate" key={item.id} onClick={() => choose(item.id)} aria-label={`Velg ${item.title} som sammenligningskilde`}>
      {item.person ? <ArchiveImage src={item.person.portraitImagePath} name={item.person.name} compact /> : <span className="candidate-paper" aria-hidden="true">▤</span>}<span><strong>{item.title}</strong><small>{item.kind}</small></span><span aria-hidden="true">↗</span>
    </button>)}</div>
    {!filtered.length && <p>Ingen andre kilder er tilgjengelige her.</p>}
    <div className="evidence-pagination"><button aria-label="Forrige sammenligningskilder" disabled={!current} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {count}</span><button aria-label="Neste sammenligningskilder" disabled={current >= count - 1} onClick={() => setPage(current + 1)}>→</button></div>
  </section>;
}
