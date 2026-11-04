import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { readReconstruction, submitReconstruction } from "./api";
import { emptyRoute, emptyTheory, useTheoryStore } from "./theoryStore";

export function ReconstructionPage() {
  const { caseId = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["reconstruction", caseId], queryFn: () => readReconstruction(caseId), staleTime: 0, refetchOnWindowFocus: false });
  const theories = useTheoryStore(s => s.theories);
  const routes = useTheoryStore(s => s.routes);
  const setTheory = useTheoryStore(s => s.setTheory);
  const draft = theories[caseId] ?? emptyTheory;
  const route = routes[caseId] ?? emptyRoute;
  const mutation = useMutation({ mutationFn: () => submitReconstruction(caseId, { ...draft, routeIds: route }), onSuccess: async result => {
    if (result.accepted) await Promise.all([client.invalidateQueries({ queryKey: ["reconstruction", caseId] }), client.invalidateQueries({ queryKey: ["progress", caseId] }), client.invalidateQueries({ queryKey: ["investigation", caseId] })]);
  } });
  if (query.isPending) return <Feedback retry={() => { void query.refetch(); }} />;
  if (query.isError) return query.error instanceof ApiError && query.error.status === 404
    ? <section className="feedback"><h1>Rekonstruksjonen er ikke klar ennå.</h1><p>Fortsett å undersøke kildene, forbindelsene og forklaringene.</p><Link to={`/cases/${encodeURIComponent(caseId)}`}>Til undersøkelsene</Link></section>
    : <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const view = query.data;
  if (view.isClosed) return <section className="epilogue"><p className="eyebrow">SAK {caseId}</p><h1>Rekonstruksjon levert</h1><div>{view.epilogue}</div><Link className="primary-button" to="/">Til saksarkivet</Link></section>;
  const ready = view.questions.every(q => draft.answers[q.id]) && draft.evidenceIds.length >= view.minEvidence && draft.evidenceIds.length <= view.maxEvidence && route.length >= 2;
  return <>
    <div className="overview-heading"><p className="eyebrow">DIN SAMLEDE VURDERING</p><h1>Rekonstruksjon</h1><p>Bygg et hendelsesforløp som forklarer kildene. En tilståelse alene erstatter ikke vurderingen av resten av materialet.</p></div>
    <form className="reconstruction-form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><fieldset disabled={mutation.isPending}><legend>Hendelsesforløpet</legend>
      {view.questions.map(question => <label key={question.id}>{question.label}<select aria-label={question.label} required value={draft.answers[question.id] ?? ""} onChange={event => { mutation.reset(); setTheory(caseId, { ...draft, answers: { ...draft.answers, [question.id]: event.target.value } }); }}><option value="">Velg en vurdering</option>{question.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}
    </fieldset><fieldset disabled={mutation.isPending}><legend>Støttende kilder</legend><p>Velg {view.minEvidence}–{view.maxEvidence} gjennomgåtte kilder. Du må skille sentrale opplysninger fra dem som ikke forklarer hendelsen.</p>
      <div className="supporting-evidence">{view.sources.map(source => <div key={source.id}><label><input type="checkbox" aria-label={`Velg ${source.title}`} checked={draft.evidenceIds.includes(source.id)} disabled={!source.reviewed || (!draft.evidenceIds.includes(source.id) && draft.evidenceIds.length >= view.maxEvidence)} onChange={event => { mutation.reset(); setTheory(caseId, { ...draft, evidenceIds: event.target.checked ? [...draft.evidenceIds, source.id] : draft.evidenceIds.filter(id => id !== source.id) }); }}/>{source.title}{!source.reviewed && <small>Ikke gjennomgått</small>}</label><Link to={`../evidence/${encodeURIComponent(source.id)}`} target="_blank" rel="noreferrer" aria-label={`Åpne ${source.title} i ny fane`}>Åpne kilde ↗</Link></div>)}</div>
    </fieldset><section className="reconstruction-route"><h2>Ruten du foreslår</h2><p>Ta med hele kjøreturen fra basen og tilbake. I vurderingen settes det av minst {view.stopAllowanceMinutes} minutter til stopp etter påstigningen. Dette er et åpent modellanslag, ikke dokumenterte stopptider.</p>
      {route.length === 0 ? <p>Ingen rute valgt.</p> : <ol>{route.map((id, index) => <li key={`${id}-${index}`}>{view.locations.find(point => point.id === id)?.name ?? "Stedet er ikke tilgjengelig"}</li>)}</ol>}
      <Link className="primary-button" to="../map">Bygg eller endre ruten i kartet</Link><p className="map-caption">Valgene dine beholdes i denne nettleseren mens du arbeider. De gir ingen tilgang til skjult materiale.</p>
    </section>
    {mutation.isError && <p className="save-error" role="alert">Kunne ikke sende vurderingen. Oppdater opplysningene og prøv igjen.</p>}
    {mutation.data && !mutation.data.accepted && <div className="theory-feedback" role="status"><h2>Undersøk videre</h2><p>{mutation.data.message}</p><p>Du kan endre teorien og prøve igjen. Fremdriften din er beholdt.</p></div>}
    <button className="primary-button" type="submit" disabled={!ready || mutation.isPending}>{mutation.isPending ? "Vurderer …" : "Lever rekonstruksjonen"}</button></form>
  </>;
}
