import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ArchiveImage } from "../../components/ArchiveImage";
import { fetchJson, formatDate, type CaseFile } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isEvidenceList, type Evidence } from "../evidence/api";
import { isPeople, type Person } from "../people/api";
import { usePaperSound } from "../atmosphere/context";
import { ActionPanel } from "../investigation/ActionPanel";
import { progressCommand, useProgress, type Progress, type CaseAction } from "../investigation/progress";
import "./desk.css";

type Outcome = { response: string; evidence: Evidence[]; people: Person[]; actions: CaseAction[] };
type Command = { type: "review" | "action"; id: string };

export function DeskPage() {
  const file = useOutletContext<CaseFile>();
  const { caseId = "" } = useParams();
  const root = `/cases/${encodeURIComponent(caseId)}`;
  const key = ["cases", caseId];
  const client = useQueryClient();
  const progress = useProgress(caseId);
  const evidence = useQuery({ queryKey: [...key, "evidence"], queryFn: ({ signal }) => fetchJson<Evidence[]>(`/api${root}/evidence`, signal, isEvidenceList) });
  const people = useQuery({ queryKey: [...key, "people"], queryFn: ({ signal }) => fetchJson<Person[]>(`/api${root}/people`, signal, isPeople) });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Evidence | null>(null);
  const [panel, setPanel] = useState<"briefing" | "actions" | "result" | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [zoom, setZoom] = useState(100);
  const dialog = useRef<HTMLDialogElement>(null);
  const paper = usePaperSound();
  const open = selected !== null || panel !== null;
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  function close() { setSelected(null); setPanel(null); }
  function inspect(item: Evidence) { paper(); setZoom(100); setPanel(null); setSelected(item); }
  const command = useMutation({ mutationFn: ({ type, id }: Command) => progressCommand(caseId,
    type === "review" ? `evidence/${encodeURIComponent(id)}/review` : `actions/${encodeURIComponent(id)}`),
    onSuccess: async (value: Progress, variables) => {
      const oldActions = new Set(progress.data?.actions.map(item => item.id) ?? []);
      const oldEvidence = evidence.data ? new Set(evidence.data.map(item => item.id)) : null;
      const oldPeople = people.data ? new Set(people.data.map(item => item.id)) : null;
      client.setQueryData(["progress", caseId], value);
      await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ["investigation", caseId] })]);
      const latestEvidence = client.getQueryData<Evidence[]>([...key, "evidence"]) ?? [];
      const latestPeople = client.getQueryData<Person[]>([...key, "people"]) ?? [];
      setOutcome({ response: variables.type === "review" ? "Opplysningene er tatt med i vurderingen. Det er fortsatt du som må vurdere hva de betyr." : value.history.find(item => item.id === variables.id)?.response ?? "Undersøkelsen er registrert.",
        evidence: latestEvidence.filter(item => oldEvidence !== null && !oldEvidence.has(item.id)), people: latestPeople.filter(item => oldPeople !== null && !oldPeople.has(item.id)), actions:value.actions.filter(item => !oldActions.has(item.id)) });
      setSelected(null); setPanel("result");
    } });
  const items = evidence.data ?? [];
  const pages = Math.max(1, Math.ceil(items.length / 3));
  const visiblePage = Math.min(page, pages - 1);
  const reviewed = progress.data?.reviewedEvidenceIds ?? [];
  const research = progress.data?.actions.filter(action => action.personId === null) ?? [];
  const actions = (research.length ? research : progress.data?.actions ?? []).slice(0, 2);
  const prompt = !reviewed.length ? "Begynn med en kilde" : !progress.data?.history.length ? "Hva vil du sammenholde?" : "Hva vil du undersøke nå?";
  const selectedReviewed = selected && reviewed.includes(selected.id);
  function run(id: string) { command.reset(); command.mutate({ type: "action", id }); }
  return <section className="desk-scene" aria-label="Etterforskningsbord">
    <header className="desk-heading"><div><p className="eyebrow">SAKSMAPPEN ER ÅPEN</p><h1>{file.title}</h1></div><button className="desk-briefing" onClick={() => setPanel("briefing")}>Les oppdraget</button></header>
    <div className="desk-surface">
      <section className="missing-file" aria-label="Savnet person"><span className="paper-clip" aria-hidden="true" /><ArchiveImage src={file.missingPersonPortraitPath} name={file.missingPerson} /><strong>{file.missingPerson}</strong><p>{file.age} år · {formatDate(file.disappearanceDate)}</p><span className="file-stamp">SAK {file.id}</span></section>
      <section className="desk-materials" aria-label="Tilgjengelige dokumenter">
        {evidence.isPending || evidence.isError ? <Feedback error={evidence.error} retry={() => { void evidence.refetch(); }} /> : <>
          <div className="desk-objects">{items.slice(visiblePage * 3, visiblePage * 3 + 3).map((item, index) => <button key={item.id} className="paper-object" onClick={() => inspect(item)} aria-label={`Undersøk ${item.title}`}>
            <span className="paper-object-type">{item.kind}</span><span className="paper-mark" aria-hidden="true">{String(visiblePage * 3 + index + 1).padStart(2, "0")}</span>
            <strong>{item.title}</strong><span className="paper-excerpt" aria-hidden="true">{item.body.split("\n").slice(0, 3).join("\n")}</span><span className="paper-lines" aria-hidden="true" /><span className="paper-object-state">{reviewed.includes(item.id) ? "Tatt med i vurderingen" : "Åpne og undersøk"} <span aria-hidden="true">↗</span></span>
          </button>)}</div>
          {items.length === 0 && <p className="desk-empty">Ingen dokumenter er tilgjengelige.</p>}
          <div className="desk-pagination"><button aria-label="Forrige dokumenter" disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>←</button><span>Dokumenter {items.length ? visiblePage * 3 + 1 : 0}–{Math.min(items.length, visiblePage * 3 + 3)} av {items.length}</span><button aria-label="Neste dokumenter" disabled={visiblePage >= pages - 1} onClick={() => setPage(visiblePage + 1)}>→</button></div>
        </>}
      </section>
    </div>
    <section className="decision-tray" aria-label="Neste undersøkelse"><div className="decision-question"><span className="eyebrow">DITT NESTE TREKK</span><h2>{prompt}</h2></div>
      {progress.isPending ? <p role="status">Åpner etterforskningen …</p> : progress.isError ? <div role="alert"><p>Kunne ikke hente etterforskningen.</p><button onClick={() => { void progress.refetch(); }}>Prøv igjen</button></div> : <div className="desk-choices">
        {actions.length > 0 ? actions.map(action => action.personId ? <Link className="decision-card" key={action.id} to={`${root}/people/${encodeURIComponent(action.personId)}`}><span className="decision-icon" aria-hidden="true">◎</span><strong>{action.label}</strong><small>Åpne samtalen og velg selv</small></Link> : <button className="decision-card" disabled={command.isPending} key={action.id} onClick={() => action.requiresRoute ? setPanel("actions") : run(action.id)}><span className="decision-icon" aria-hidden="true">↗</span><strong>{action.label}</strong><small>Følg opp sporet</small></button>) : <>
          <Link className="decision-card" to={`${root}/people`}><span className="decision-icon" aria-hidden="true">◎</span><strong>Se forklaringene</strong><small>Hvem kan belyse opplysningene?</small></Link>
          <Link className="decision-card" to={`${root}/timeline`}><span className="decision-icon" aria-hidden="true">◷</span><strong>Sammenlign tidspunktene</strong><small>Hva vet vi om rekkefølgen?</small></Link>
        </>}
        <button className="decision-card" onClick={() => setPanel("actions")}><span className="decision-icon" aria-hidden="true">⌕</span><strong>Følg opp undersøkelsene</strong><small>Åpne spor og tidligere svar</small></button>
      </div>}
      {command.isError && !open && <p role="alert">{command.error.message} <button onClick={() => { command.reset(); void progress.refetch(); }}>Oppdater</button></p>}
      {command.isPending && !open && <p role="status">Undersøker …</p>}
    </section>
    <dialog className="desk-dialog" ref={dialog} onClose={close} aria-label={selected ? "Undersøk dokument" : panel === "briefing" ? "Oppdraget" : panel === "result" ? "Resultat av undersøkelsen" : "Undersøkelser"}>
      <header className="desk-dialog-header"><span>{selected?.kind ?? "SAKSARKIV"}</span><button onClick={() => dialog.current?.close()}>Tilbake til bordet</button></header>
      {selected ? <div className="inspection-layout"><section className="inspection-paper-pane" aria-label="Dokumentinnhold" tabIndex={0}>
        <div className="inspection-zoom"><button aria-label="Mindre dokumenttekst" disabled={zoom <= 100} onClick={() => setZoom(value => value - 20)}>A−</button><span>{zoom} %</span><button aria-label="Større dokumenttekst" disabled={zoom >= 180} onClick={() => setZoom(value => value + 20)}>A+</button></div>
        <article className="inspection-paper" style={{ fontSize: `${zoom}%` }}><span className="eyebrow">{selected.source}</span><h2>{selected.title}</h2><div>{selected.body}</div></article>
      </section><section className="inspection-decisions"><p className="eyebrow">VURDER KILDEN</p><h2>Hva vil du gjøre med opplysningene?</h2><p>En opplysning er et grunnlag for videre undersøkelser, ikke en konklusjon.</p>
        <button className="decision-card" aria-label={selectedReviewed ? "Tatt med i vurderingen" : "Ta med i vurderingen"} disabled={command.isPending || !progress.isSuccess || !!selectedReviewed} onClick={() => { command.reset(); command.mutate({ type: "review", id: selected.id }); }}><strong>{selectedReviewed ? "Tatt med i vurderingen" : command.isPending ? "Registrerer …" : "Ta med i vurderingen"}</strong><small>Behold kilden som grunnlag for videre spørsmål</small></button>
        <Link className="decision-card" to={`${root}/evidence/${encodeURIComponent(selected.id)}?compare=1`}><strong>Sammenlign med en annen kilde</strong><small>Legg dokumentet ved siden av et annet dokument eller en person</small></Link>
        <Link className="decision-card" to={`${root}/timeline`}><strong>Åpne tidslinjen</strong><small>Sammenlign de dokumenterte tidspunktene</small></Link>
        {progress.isError && <div role="alert"><p>Lagring er ikke tilgjengelig ennå.</p><button onClick={() => { void progress.refetch(); }}>Prøv igjen</button></div>}
        {command.isError && <p role="alert">{command.error.message}<button onClick={() => { command.reset(); void progress.refetch(); }}>Oppdater</button></p>}
      </section></div> : panel === "briefing" ? <section className="desk-dialog-content briefing-paper"><p className="eyebrow">UTGANGSPUNKTET</p><h2>{file.title}</h2><p>{file.initialReport}</p><p>Du bestemmer rekkefølgen. Opplysningene må vurderes mot hverandre før du trekker en konklusjon.</p>
        <div className="opening-guide" aria-label="Slik arbeider du"><article><span aria-hidden="true">▤</span><h3>Åpne en kilde</h3><p>Les dokumentet og velg «Ta med i vurderingen» når du vil bruke det videre. Markeringen bekrefter ikke at innholdet er sant.</p></article><article><span aria-hidden="true">◷</span><h3>Sammenhold opplysningene</h3><p>Legg to kilder ved siden av hverandre. Bruk tidslinjen og kartet til å prøve rekkefølge, tid og avstand. På tavlen kan du lagre egne forbindelser.</p></article><article><span aria-hidden="true">↗</span><h3>Følg opp det som åpner seg</h3><p>Gjennomgåtte kilder og lagrede forbindelser kan åpne nye spørsmål. Nye muligheter vises etter undersøkelsen; du velger hva du følger opp.</p></article></div>
        <p>Verktøyene ligger også i «Mappen» nederst. Notater og forbindelser på tavlen må lagres med «Lagre tavlen»; et utkast i kartet eller rekonstruksjonen beholdes på denne enheten.</p><button className="outcome-return" onClick={() => dialog.current?.close()}>Begynn ved bordet</button></section> : panel === "result" && outcome ? <section className="desk-dialog-content investigation-outcome" aria-live="polite"><p className="eyebrow">UNDERSØKELSEN ER REGISTRERT</p><h2>Tilbake til kildene</h2><p>{outcome.response}</p>
        {outcome.evidence.length + outcome.people.length > 0 && <h3>Nytt materiale på bordet</h3>}
        {outcome.evidence.map(item => <button className="new-material" key={item.id} onClick={() => inspect(item)}><span aria-hidden="true">▤</span> {item.title} <span>Åpne dokumentet ↗</span></button>)}
        {outcome.people.map(person => <Link className="new-material" to={`${root}/people/${encodeURIComponent(person.id)}`} key={person.id}>{person.name} · Se opplysningene ↗</Link>)}
        {outcome.actions.length > 0 && <section className="opening-followups" aria-label="Nye oppfølgingsmuligheter"><h3>Dette kan du følge opp nå</h3><p>Muligheten er åpnet av materialet du har undersøkt. Den er ikke en konklusjon.</p>{outcome.actions.map(action => action.personId ? <Link key={action.id} className="new-material" to={`${root}/people/${encodeURIComponent(action.personId)}`}>{action.label} · Åpne samtalen ↗</Link> : <button key={action.id} className="new-material" disabled={command.isPending} onClick={() => action.requiresRoute ? setPanel("actions") : run(action.id)}>{action.label} · Følg opp ↗</button>)}</section>}
        <button className="outcome-return" onClick={() => { setPage(0); close(); }}>Fortsett ved bordet</button>
      </section> : <section className="desk-dialog-content"><ActionPanel /></section>}
    </dialog>
  </section>;
}
