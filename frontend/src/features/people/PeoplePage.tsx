import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArchiveImage } from "../../components/ArchiveImage";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isEvidenceList, type Evidence } from "../evidence/api";
import { progressCommand, useProgress, type CaseAction } from "../investigation/progress";
import { usePaperSound } from "../atmosphere/context";
import { isPeople, type Person } from "./api";
import { replyPages } from "./replyPages";
import "./people.css";

export function PeoplePage() {
  const { caseId = "", personId } = useParams();
  const query = useQuery({ queryKey: ["cases", caseId, "people"], queryFn: ({ signal }) => fetchJson<Person[]>(`/api/cases/${encodeURIComponent(caseId)}/people`, signal, isPeople) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const selected = query.data.find(person => person.id === personId);
  if (personId && !selected) return <section className="people-stage missing-person-record"><h1>Personen finnes ikke i denne saken.</h1><Link to="../people">Til personene</Link></section>;
  return selected ? <InterviewStage key={`${caseId}:${selected.id}`} caseId={caseId} person={selected} /> : <PeopleGallery caseId={caseId} people={query.data} />;
}
function PeopleGallery({ caseId, people }: { caseId:string; people:Person[] }) {
  const progress = useProgress(caseId);
  const [page, setPage] = useState(0);
  const count = Math.max(1, Math.ceil(people.length / 4));
  const current = Math.min(page, count - 1);
  return <section className="people-stage" aria-label="Personregister"><header className="people-stage-heading"><div><p className="eyebrow">MENNESKENE I SAKEN</p><h1>Personer</h1></div><p>Velg en person. Sammenhold forklaringene med kildene.</p></header>
    <div className="portrait-deck">{people.slice(current * 4, current * 4 + 4).map(person => {
      const available = progress.data?.actions.some(action => action.personId === person.id);
      return <Link className="portrait-file" key={person.id} to={`../people/${encodeURIComponent(person.id)}`} aria-label={`${person.name}, ${person.role}`}>
        <ArchiveImage src={person.portraitImagePath} name={person.name} /><strong>{person.name}</strong><span>{person.role}</span><small>{available ? "Nytt spørsmål kan stilles" : "Åpne personopplysningene"} <span aria-hidden="true">↗</span></small>
      </Link>;
    })}</div>
    <footer className="portrait-pagination"><button aria-label="Forrige personer" disabled={current === 0} onClick={() => setPage(current - 1)}>←</button><span>Alder og opplysninger gjelder 1999. En tilknytning er ikke bevis på ansvar.</span><button aria-label="Neste personer" disabled={current >= count - 1} onClick={() => setPage(current + 1)}>→</button></footer>
  </section>;
}
function InterviewStage({ caseId, person }: { caseId:string; person:Person }) {
  const root = `/cases/${encodeURIComponent(caseId)}`;
  const key = ["cases", caseId];
  const client = useQueryClient();
  const progress = useProgress(caseId);
  const evidence = useQuery({ queryKey:[...key, "evidence"], queryFn: ({ signal }) => fetchJson<Evidence[]>(`/api${root}/evidence`, signal, isEvidenceList) });
  const paper = usePaperSound();
  const [topic, setTopic] = useState<{ action:CaseAction; version:number } | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyPage, setReplyPage] = useState(0);
  const [questionPage, setQuestionPage] = useState(0);
  const [newSources, setNewSources] = useState<Evidence[]>([]);
  const log = useRef<HTMLDialogElement>(null);
  const responseHeading = useRef<HTMLHeadingElement>(null);
  const history = progress.data?.history.filter(entry => entry.personId === person.id) ?? [];
  const activeReply = history.find(entry => entry.id === replyId) ?? history.at(-1);
  const pages = replyPages(activeReply?.response ?? person.introduction);
  const currentReplyPage = Math.min(replyPage, pages.length - 1);
  const actions = progress.data?.actions.filter(action => action.personId === person.id) ?? [];
  const questions = Math.min(questionPage, Math.max(0, Math.ceil(actions.length / 3) - 1));
  useEffect(() => { if (replyId) responseHeading.current?.focus(); }, [replyId]);
  const mutation = useMutation({ mutationFn: ({ action, approachId, version }: { action:CaseAction; approachId?:string; version:number }) =>
    progressCommand(caseId, `actions/${encodeURIComponent(action.id)}`, undefined, approachId ? { approachId, expectedVersion:version } : undefined),
    onSuccess: async (value, variables) => {
      const before = evidence.data ? new Set(evidence.data.map(item => item.id)) : null;
      client.setQueryData(["progress", caseId], value);
      await Promise.all([client.invalidateQueries({ queryKey:key }), client.invalidateQueries({ queryKey:["investigation", caseId] })]);
      const latest = client.getQueryData<Evidence[]>([...key, "evidence"]) ?? [];
      setNewSources(before ? latest.filter(item => !before.has(item.id)) : []);
      setTopic(null); setReplyPage(0); setQuestionPage(0); setReplyId(variables.action.id); paper();
    } });
  function selectQuestion(action:CaseAction) {
    mutation.reset();
    if (!progress.data) return;
    if (action.approaches?.length) setTopic({ action, version:progress.data.version });
    else mutation.mutate({ action, version:progress.data.version });
  }
  async function refresh() { mutation.reset(); setTopic(null); await progress.refetch(); }
  return <section className="people-stage interview-stage" aria-label="Samtale og personopplysninger">
    <header className="people-stage-heading"><div><p className="eyebrow">FORKLARINGENE MÅ PRØVES MOT KILDENE</p><h1>{person.name}</h1></div><Link className="quiet-game-link" to="../people">← Personer</Link></header>
    <div className="interview-scene"><section className="interview-portrait"><span className="paper-clip" aria-hidden="true"/><ArchiveImage src={person.portraitImagePath} name={person.name}/><strong className="interview-person-name">{person.name}</strong><p>{person.role}</p><small>{person.age} år i 1999</small></section>
      <section className="interview-conversation" aria-label="Gjeldende forklaring"><header><span className="eyebrow">{activeReply ? "REGISTRERT FORKLARING" : "ARKIVOPPLYSNINGER"}</span><button disabled={!history.length} onClick={() => log.current?.showModal()}>Tidligere samtaler</button></header>
        <div className="action-history" aria-live="polite"><h2 ref={responseHeading} tabIndex={-1}>{activeReply?.label ?? "Utgangspunktet"}</h2>
          {activeReply?.approach && <p className="approach-receipt">Din tilnærming: {activeReply.approach.label}</p>}
          <blockquote>{pages[currentReplyPage]}</blockquote>
        </div>
        <div className="reply-pagination"><button aria-label="Forrige del av forklaringen" disabled={currentReplyPage === 0} onClick={() => setReplyPage(currentReplyPage - 1)}>←</button><span>{currentReplyPage + 1} / {pages.length}</span><button aria-label="Neste del av forklaringen" disabled={currentReplyPage >= pages.length - 1} onClick={() => setReplyPage(currentReplyPage + 1)}>→</button></div>
        {newSources.length > 0 && <div className="interview-sources" aria-label="Nytt materiale">{newSources.map(item => <Link key={item.id} to={`${root}/evidence/${encodeURIComponent(item.id)}`}>Nytt dokument: {item.title} ↗</Link>)}</div>}
      </section>
    </div>
    <section className="interview-choices" aria-label="Samtalevalg"><div className="interview-prompt"><p className="eyebrow">{topic ? "VELG TILNÆRMING" : "DITT NESTE SPØRSMÅL"}</p><h2>{topic ? "Hvordan vil du ta det opp?" : "Hva vil du avklare?"}</h2>{topic && <p>Valget lagres når du stiller spørsmålet.</p>}</div>
      {progress.isPending ? <p role="status">Henter samtalen …</p> : progress.isError ? <div role="alert"><p>Kunne ikke hente samtalen.</p><button onClick={() => { void refresh(); }}>Prøv igjen</button></div> : topic ? <div className="interview-choice-cards">
        {topic.action.approaches?.map(approach => <button key={approach.id} className="decision-card" disabled={mutation.isPending} onClick={() => mutation.mutate({ action:topic.action, approachId:approach.id, version:topic.version })}><span aria-hidden="true">↗</span><strong>{approach.label}</strong></button>)}
        <button className="decision-card" disabled={mutation.isPending} onClick={() => setTopic(null)}><strong>Tilbake til spørsmålene</strong><small>Ingen tilnærming er registrert ennå</small></button>
      </div> : actions.length > 0 ? <div className="interview-choice-cards">{actions.slice(questions * 3, questions * 3 + 3).map(action => <button className="decision-card" key={action.id} disabled={mutation.isPending} onClick={() => selectQuestion(action)}><span aria-hidden="true">↗</span><strong>{action.label}</strong></button>)}
        {actions.length > 3 && <button className="more-questions" onClick={() => setQuestionPage((questions + 1) % Math.ceil(actions.length / 3))}>Flere spørsmål →</button>}
      </div> : <div className="interview-choice-cards"><Link className="decision-card" to={`${root}/evidence`}><strong>Undersøk kildene</strong><small>Nye spørsmål krever et grunnlag</small></Link><Link className="decision-card" to={`${root}/board`}><strong>Sammenhold på tavlen</strong><small>Undersøk forbindelsene mellom kildene</small></Link></div>}
      {mutation.isPending && <p className="interview-operation" role="status">Registrerer spørsmålet …</p>}
      {mutation.isError && <div className="interview-operation" role="alert"><p>{mutation.error.message}</p><button onClick={() => { void refresh(); }}>Oppdater samtalen</button></div>}
    </section>
    <dialog className="desk-dialog interview-log" ref={log} aria-label="Tidligere samtaler"><header className="desk-dialog-header"><span>SAMTALEHISTORIKK</span><button onClick={() => log.current?.close()}>Tilbake til samtalen</button></header><section className="desk-dialog-content conversation-log">{history.map(entry => <article key={entry.id}><h2>{entry.label}</h2>{entry.approach && <p>Din tilnærming: {entry.approach.label}</p>}<p>{entry.response}</p></article>)}</section></dialog>
  </section>;
}
