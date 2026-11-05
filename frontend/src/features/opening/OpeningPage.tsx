import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { readBoard, saveBoard } from "../board/api";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isEvidenceList, type Evidence } from "../evidence/api";
import { progressCommand, readProgress, useProgress } from "../investigation/progress";
import "./opening.css";

async function pair(caseId: string, fromId: string, toId: string, label: string) {
  const snapshot = await readBoard(caseId);
  const { board } = snapshot;
  if (board.connections.some(link =>
    (link.fromId === fromId && link.toId === toId) || (link.fromId === toId && link.toId === fromId))) return;
  const missing = [fromId, toId].filter(id => !board.positions.some(point => point.id === id));
  if (board.positions.length + missing.length > 128 || board.connections.length >= 128)
    throw new Error("Tavlen er full. Frigjør plass på tavlen og prøv igjen.");
  const positions = missing.map((id, offset) => {
    const index = board.positions.length + offset;
    return { id, x: 40 + (index % 8) * 240, y: 40 + Math.floor(index / 8) * 220 };
  });
  await saveBoard(caseId, {
    ...snapshot,
    board: {
      ...board,
      positions: [...board.positions, ...positions],
      connections: [...board.connections, { id: crypto.randomUUID(), fromId, toId, label }],
    },
  });
}

export function OpeningPage() {
  const { caseId = "" } = useParams();
  const root = `/cases/${encodeURIComponent(caseId)}`;
  const client = useQueryClient();
  const progress = useProgress(caseId);
  const evidence = useQuery({
    queryKey: ["cases", caseId, "evidence"],
    queryFn: ({ signal }) => fetchJson<Evidence[]>(`/api${root}/evidence`, signal, isEvidenceList),
  });
  const [inspect, setInspect] = useState<string>();
  const [selected, setSelected] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [showInference, setShowInference] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const command = useMutation({
    mutationFn: (work: () => Promise<unknown>) => work(),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["progress", caseId] }),
        client.invalidateQueries({ queryKey: ["cases", caseId, "evidence"] }),
        client.invalidateQueries({ queryKey: ["investigation", caseId] }),
      ]);
    },
  });
  if (caseId !== "1999-1218") return <Link to={root}>Til saksoversikten</Link>;
  if (!progress.isSuccess || !evidence.isSuccess) return <Feedback error={progress.error ?? evidence.error}
    retry={() => { void progress.refetch(); void evidence.refetch(); }} />;

  const state = progress.data;
  const history = (id: string) => state.history.find(item => item.id === id);
  const source = (id: string) => evidence.data.find(item => item.id === id);
  const reviewed = (id: string) => state.reviewedEvidenceIds.includes(id);
  const review = async (...ids: string[]) => {
    for (const id of ids) await progressCommand(caseId, `evidence/${id}/review`);
  };
  const act = (id: string) => progressCommand(caseId, `actions/${id}`);
  const run = (work: () => Promise<unknown>) => {
    setHint("");
    command.mutate(work);
  };
  const openedMarket = !!history("witness-followup");
  const spoke = history("maria-plan");
  const note = !!history("find-note");
  const readyToInterview = state.actions.find(item => item.id === "maria-plan");
  const stage = openedMarket ? 4 : spoke ? 3 : note ? 2 : 1;
  const heading = ["Velg ditt første spor", "Samtalen med Maria", "En plan eller en reise?", "Nytt spor ved butikken"][stage - 1];
  const shown = source(inspect ?? "");
  function card(id: string, select = false) {
    const item = source(id);
    if (!item) return null;
    return <div className="opening-source" key={id}>
      <button type="button" onClick={() => setInspect(inspect === id ? undefined : id)} aria-expanded={inspect === id}>
        <small>{item.kind}</small>{item.title}
      </button>
      {select && <button type="button" aria-label={`Velg som grunnlag: ${item.title}`} aria-pressed={selected.includes(id)} onClick={() => {
        setShowInference(false);
        setHint("");
        setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
      }}>Velg som grunnlag</button>}
    </div>;
  }

  return <section className="opening-stage" aria-label="Saksforløp">
    <div className={stage === 2 ? "opening-image maria" : "opening-image"}>
      <span>SKARDAL · 18. DESEMBER 1999</span>
    </div>
    <div className="opening-work">
      <p className="eyebrow" role="status">ETTERFORSKNING · {stage} / 4</p>
      <h1>{heading}</h1>
      <fieldset disabled={command.isPending}>
        {stage === 1 && <>
          <p>Ingrid er savnet. Hvor vil du begynne?</p>
          {showPhone && history("phone-lookup") && <p role="status">{history("phone-lookup")?.response}</p>}
          <div className="opening-cards">
            {card("phone-log")}{card("maria-statement")}
          </div>
          {!history("phone-lookup") && <button onClick={() => run(async () => {
            await review("phone-log", "jonas-statement");
            await act("phone-lookup");
            setShowPhone(true);
          })}>Kontroller samtalen kl. 21.47</button>}
          <button onClick={() => run(async () => {
            await review("hotel-log", "maria-statement");
            await act("find-note");
          })}>Følg reiseplanen med Maria</button>
        </>}
        {stage === 2 && <>
          <p>Hvilken kilde vil du knytte til Marias forklaring om reiseplanen?</p>
          <div className="opening-cards">{card("ingrid-note")}{card("phone-log")}</div>
          {!readyToInterview ? <>
            <button onClick={() => run(async () => {
              await review("ingrid-note", "maria-statement");
              await pair(caseId, "person:maria", "evidence:ingrid-note", "Avtalen om bagen");
            })}>Knytt Ingrids notat til Maria</button>
            <button onClick={() => setHint("Samtaleloggen viser kontakt. Se etter en kilde som omtaler en avtale med Maria.")}>Knytt samtaleloggen til Maria</button>
          </> : <>
            <p>Notatet gir deg grunnlag for en samtale. Hvordan vil du åpne den?</p>
            {readyToInterview.approaches?.map(approach => <button key={approach.id} onClick={() => run(async () => {
              const latest = await readProgress(caseId);
              await progressCommand(caseId, "actions/maria-plan", undefined, { approachId: approach.id, expectedVersion: latest.version });
            })}>{approach.label}</button>)}
          </>}
        </>}
        {stage === 3 && <>
          <p className="opening-reply">{spoke?.response}</p>
          <p>Velg to kilder som lar deg undersøke om den planlagte reisen ble gjennomført.</p>
          <div className="opening-cards">{["travel-bag", "bus-ticket", "phone-log"].map(id => card(id, true))}</div>
          <button disabled={selected.length !== 2} onClick={() => {
            const relevant = selected.includes("travel-bag") && selected.includes("bus-ticket");
            setShowInference(relevant);
            setHint(relevant ? "" : "Se etter én kilde om det Ingrid skulle hente, og én om selve reisen.");
          }}>Sammenhold kildene</button>
          {showInference && <div className="opening-inference">
            <h2>Hva kan de to kildene underbygge?</h2>
            <button onClick={() => run(async () => {
              await review("travel-bag", "bus-ticket", "market-witness");
              await pair(caseId, "evidence:travel-bag", "evidence:bus-ticket", "Reisen var planlagt");
              await act("witness-followup");
            })}>Hun planla å reise. Kildene viser ikke at hun dro.</button>
            <button onClick={() => setHint("Se på hva som faktisk skjedde med bagen og billetten.")}>Hun tok bussen til Trondheim.</button>
            <button onClick={() => setHint("Kildene handler om reiseplanen. Sier de hvor hun endte?")}>Maria vet hvor Ingrid endte.</button>
          </div>}
        </>}
        {stage === 4 && <>
          <p>Reiseplanen er undersøkt. Et nytt vitnespor knytter et kjøretøy til observasjonen ved butikken.</p>
          {card("vehicle-witness")}
          <Link className="primary-button" to={root}>Tilbake til saksoversikten ↗</Link>
        </>}
      </fieldset>
      {shown && <aside className="opening-document" aria-label="Kildeutdrag"><strong>{shown.title}</strong><p>{shown.body}</p>
        <button onClick={() => setInspect(undefined)}>Lukk kilden</button>
        {reviewed(shown.id) && <small>Gjennomgått kilde</small>}
      </aside>}
      <p role="status" className="opening-hint">{command.isPending ? "Arbeider med sporet …" : hint}</p>
      {command.isError && <p role="alert">{command.error.message} <button onClick={() => command.reset()}>Lukk meldingen</button></p>}
    </div>
  </section>;
}
