import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { readReconstruction, submitReconstruction } from "./api";
import { emptyRoute, emptyTheory, useTheoryStore } from "./theoryStore";
import { ReconstructionMap } from "./ReconstructionMap";
import "./reconstruction.css";

const stages = [{ id:"theory", label:"Hendelsesforløp" }, { id:"sources", label:"Kilder" }, { id:"route", label:"Rute" }, { id:"review", label:"Samlet vurdering" }] as const;
type Stage = typeof stages[number]["id"];
export function ReconstructionPage() {
  const { caseId = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey:["reconstruction", caseId], queryFn:() => readReconstruction(caseId), staleTime:0, refetchOnWindowFocus:false });
  const draft = useTheoryStore(s => s.theories[caseId] ?? emptyTheory);
  const route = useTheoryStore(s => s.routes[caseId] ?? emptyRoute);
  const setTheory = useTheoryStore(s => s.setTheory);
  const [stage, setStage] = useState<Stage>("theory");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [sourcePage, setSourcePage] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [stage, questionIndex, query.isSuccess, query.data?.isClosed]);
  const mutation = useMutation({ mutationFn:() => submitReconstruction(caseId, { ...draft, routeIds:route }), onSuccess:async result => {
    if (result.accepted) await Promise.all([client.invalidateQueries({ queryKey:["reconstruction", caseId] }), client.invalidateQueries({ queryKey:["progress", caseId] }), client.invalidateQueries({ queryKey:["investigation", caseId] })]);
  } });
  if (query.isPending) return <Feedback retry={() => { void query.refetch(); }} />;
  if (query.isError) return query.error instanceof ApiError && query.error.status === 404
    ? <section className="reconstruction-stage reconstruction-locked"><p className="eyebrow">UNDERSØK VIDERE</p><h1>Rekonstruksjonen er ikke klar ennå.</h1><p>Fortsett å undersøke kildene, forbindelsene og forklaringene.</p><Link to={`/cases/${encodeURIComponent(caseId)}`}>Til undersøkelsene ↗</Link></section>
    : <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const view = query.data;
  if (view.isClosed) return <section className="reconstruction-stage reconstruction-ending"><header><p className="eyebrow">SAK {caseId}</p><h1 ref={heading} tabIndex={-1}>Rekonstruksjon levert</h1></header><div className="epilogue" tabIndex={0} role="region" aria-label="Sakens etterspill">{view.epilogue}</div><Link className="ending-return" to="/">Til saksarkivet ↗</Link></section>;
  const index = Math.min(questionIndex, Math.max(0, view.questions.length - 1));
  const question = view.questions[index];
  const answerValid = !!question?.options.some(option => option.id === draft.answers[question.id]);
  const answersReady = view.questions.length > 0 && view.questions.every(q => q.options.some(option => option.id === draft.answers[q.id]));
  const sourceValid = (id:string) => view.sources.some(source => source.id === id && source.reviewed);
  const sourcesReady = draft.evidenceIds.length >= view.minEvidence && draft.evidenceIds.length <= view.maxEvidence && draft.evidenceIds.every(sourceValid);
  const routeReady = route.length >= 2 && route.every(id => view.locations.some(place => place.id === id));
  const ready = answersReady && sourcesReady && routeReady;
  const count = Math.max(1, Math.ceil(view.sources.length / 4));
  const currentPage = Math.min(sourcePage, count - 1);
  const changeStage = (next:Stage) => { mutation.reset(); setStage(next); };
  return <section className="reconstruction-stage" aria-label="Rekonstruksjonsverksted" aria-busy={mutation.isPending}>
    <header className="reconstruction-heading"><div><p className="eyebrow">DIN SAMLEDE VURDERING</p><h1>Rekonstruksjon</h1></div><p>Bygg en forklaring som holder kildene, tidspunktene og ruten sammen.</p></header>
    <nav className="reconstruction-stages" aria-label="Deler av rekonstruksjonen">{stages.map((item,i) => <button key={item.id} aria-label={`${i + 1} ${item.label}`} disabled={mutation.isPending} aria-current={stage === item.id ? "step" : undefined} onClick={() => changeStage(item.id)}><span>{i + 1}</span>{item.label}</button>)}</nav>
    <div className="reconstruction-content">
      {stage === "theory" && <section className="reconstruction-theory" aria-label="Hendelsesforløpet"><header><p className="eyebrow">VURDERING {index + 1} / {view.questions.length}</p><h2 ref={heading} tabIndex={-1}>{question?.label ?? "Ingen vurderingsspørsmål er tilgjengelige."}</h2><p>Velg forklaringen du vil undersøke samlet. Du kan gå tilbake og endre den.</p></header>
        {question && <fieldset className="theory-option-cards" disabled={mutation.isPending}><legend className="sr-only">{question.label}</legend>{question.options.map(option => <label key={option.id} className={draft.answers[question.id] === option.id ? "selected" : ""}><input type="radio" name={question.id} aria-label={option.label} checked={draft.answers[question.id] === option.id} onChange={() => { mutation.reset(); setTheory(caseId, { ...draft, answers:{ ...draft.answers, [question.id]:option.id } }); }}/><span>{option.label}</span></label>)}</fieldset>}
        <div className="reconstruction-step-actions"><button disabled={!index || mutation.isPending} onClick={() => setQuestionIndex(index - 1)}>Forrige vurdering</button>{index < view.questions.length - 1 ? <button disabled={!answerValid || mutation.isPending} onClick={() => setQuestionIndex(index + 1)}>Neste vurdering</button> : <button disabled={!answerValid || mutation.isPending} onClick={() => changeStage("sources")}>Velg støttende kilder ↗</button>}</div>
      </section>}
      {stage === "sources" && <section className="reconstruction-sources" aria-label="Støttende kilder"><header><div><p className="eyebrow">VELG DET SOM STØTTER FORKLARINGEN</p><h2 ref={heading} tabIndex={-1}>Hvilke kilder bærer vurderingen?</h2></div><p>Velg {view.minEvidence}–{view.maxEvidence} gjennomgåtte kilder. Valgt: {draft.evidenceIds.length}.</p></header><div className="reconstruction-source-cards">{view.sources.slice(currentPage * 4, currentPage * 4 + 4).map(source => <article key={source.id}><label className={draft.evidenceIds.includes(source.id) ? "selected" : ""}><input type="checkbox" aria-label={`Velg ${source.title}`} checked={draft.evidenceIds.includes(source.id)} disabled={mutation.isPending || !source.reviewed || (!draft.evidenceIds.includes(source.id) && draft.evidenceIds.length >= view.maxEvidence)} onChange={event => { mutation.reset(); setTheory(caseId, { ...draft, evidenceIds:event.target.checked ? [...draft.evidenceIds, source.id] : draft.evidenceIds.filter(id => id !== source.id) }); }}/><span><strong>{source.title}</strong><small>{!source.reviewed ? "Må gjennomgås først" : "Vurder sammen med de andre kildene"}</small></span></label><Link to={`../evidence/${encodeURIComponent(source.id)}`} target="_blank" rel="noreferrer" aria-label={`Åpne ${source.title} i ny fane`}>Åpne kilde ↗</Link></article>)}</div>
        {draft.evidenceIds.some(id => !sourceValid(id)) && <div className="reconstruction-draft-warning"><p>Noen valgte kilder er ikke tilgjengelige eller gjennomgått. Utkastet er beholdt.</p><button onClick={() => { mutation.reset(); setTheory(caseId, { ...draft, evidenceIds:draft.evidenceIds.filter(sourceValid) }); }}>Fjern utilgjengelige kildevalg</button></div>}
        <div className="reconstruction-step-actions"><button aria-label="Forrige støttekilder" disabled={!currentPage} onClick={() => setSourcePage(currentPage - 1)}>←</button><span>{currentPage + 1} / {count}</span><button aria-label="Neste støttekilder" disabled={currentPage >= count - 1} onClick={() => setSourcePage(currentPage + 1)}>→</button><button onClick={() => changeStage("route")}>Kontroller ruten ↗</button></div>
      </section>}
      {stage === "route" && <section className="reconstruction-route-stage" aria-label="Din foreslåtte rute"><div><p className="eyebrow">HELE KJØRETUREN</p><h2 ref={heading} tabIndex={-1}>Ruten du foreslår</h2><p>Ta med hele kjøreturen fra basen og tilbake. I vurderingen settes det av minst {view.stopAllowanceMinutes} minutter til stopp etter påstigningen. Dette er et åpent modellanslag, ikke dokumenterte stopptider.</p><button aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>{showMap ? "Skjul kartet" : "Bygg ruten her"}</button>{showMap && <ReconstructionMap caseId={caseId} />}<Link to="../map">Åpne stort kart ↗</Link></div><div className="reconstruction-route-paper" tabIndex={0} role="region" aria-label="Stedene i ruteutkastet">{!route.length ? <p>Ingen rute valgt.</p> : <ol>{route.map((id,i) => <li key={`${id}-${i}`}><span>{i + 1}</span>{view.locations.find(place => place.id === id)?.name ?? "Stedet er ikke tilgjengelig"}</li>)}</ol>}</div><div className="reconstruction-step-actions"><button onClick={() => changeStage("sources")}>Til kildevalgene</button><button onClick={() => changeStage("review")}>Se samlet vurdering ↗</button></div></section>}
      {stage === "review" && <section className="reconstruction-review" aria-label="Kontroll før innsending"><header><p className="eyebrow">SE GJENNOM FORKLARINGEN</p><h2 ref={heading} tabIndex={-1}>Henger vurderingen sammen?</h2><p>En tilståelse alene erstatter ikke vurderingen av resten av materialet.</p></header><div className="reconstruction-review-paper" tabIndex={0} role="region" aria-label="Oppsummering av utkastet"><dl>{view.questions.map(q => <div key={q.id}><dt>{q.label}</dt><dd>{q.options.find(option => option.id === draft.answers[q.id])?.label ?? "Ikke valgt"}</dd></div>)}</dl><h3>Støttende kilder</h3><ul>{draft.evidenceIds.map(id => <li key={id}>{view.sources.find(source => source.id === id)?.title ?? "Kilden er ikke tilgjengelig"}</li>)}</ul><p>Ruteutkastet består av {route.length} punkter. Kontroller rekkefølgen under «Rute».</p></div>
        <div className="reconstruction-readiness"><button onClick={() => changeStage("theory")}>{answersReady ? "✓" : "○"} Hendelsesforløp</button><button onClick={() => changeStage("sources")}>{sourcesReady ? "✓" : "○"} Kildegrunnlag</button><button onClick={() => changeStage("route")}>{routeReady ? "✓" : "○"} Ruteutkast</button><p>Markeringene viser bare at utkastet er utfylt. Forklaringen er ikke vurdert ennå.</p></div>
        {mutation.isError && <p role="alert">Kunne ikke sende vurderingen. Utkastet er beholdt. Prøv igjen når forbindelsen er tilbake.</p>}
        {mutation.data && !mutation.data.accepted && <div className="theory-feedback" role="status"><h3>Undersøk videre</h3><p>{mutation.data.message}</p><p>Du kan endre teorien og prøve igjen. Fremdriften din er beholdt.</p></div>}
        <button className="reconstruction-submit" disabled={!ready || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Vurderer …" : "Lever rekonstruksjonen"}</button>
      </section>}
    </div><p className="reconstruction-draft-receipt">Utkastet beholdes på denne enheten mens du arbeider. Valgene gir ingen tilgang til skjult materiale.</p>
  </section>;
}
