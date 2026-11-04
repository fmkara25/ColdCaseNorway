import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isPeople, type Person } from "../people/api";
import { isEvidenceList, type Evidence } from "../evidence/api";
import { canConnect, openInvestigation, removeCard, saveBoard, type BoardSnapshot, type BoardState } from "./api";

export function BoardPage({ notesOnly = false }: { notesOnly?: boolean }) {
  const { caseId = "" } = useParams();
  const query = useQuery({ queryKey: ["investigation", caseId], queryFn: () => openInvestigation(caseId), refetchOnWindowFocus: false, staleTime: 0, refetchOnMount: "always" });
  const people = useQuery({ queryKey: ["cases", caseId, "people"], queryFn: ({ signal }) => fetchJson<Person[]>(`/api/cases/${encodeURIComponent(caseId)}/people`, signal, isPeople) });
  const evidence = useQuery({ queryKey: ["cases", caseId, "evidence"], queryFn: ({ signal }) => fetchJson<Evidence[]>(`/api/cases/${encodeURIComponent(caseId)}/evidence`, signal, isEvidenceList) });
  if (!query.data || query.isFetching || !people.data || !evidence.data) {
    return <Feedback error={query.error ?? people.error ?? evidence.error} retry={() => { void query.refetch(); void people.refetch(); void evidence.refetch(); }} />;
  }
  return <BoardEditor key={caseId} caseId={caseId} initial={query.data} people={people.data} evidence={evidence.data} notesOnly={notesOnly} reload={async () => {
    const fresh = await query.refetch(); return fresh.isSuccess ? fresh.data : undefined;
  }} />;
}

function BoardEditor({ caseId, initial, people, evidence, notesOnly, reload }: {
  caseId: string; initial: BoardSnapshot; people: Person[]; evidence: Evidence[]; notesOnly: boolean; reload: () => Promise<BoardSnapshot | undefined>;
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<BoardSnapshot>(initial);
  const [dirty, setDirty] = useState(false);
  const blocker = useBlocker(dirty);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (blocker.state === "blocked") leaveDialog.current?.showModal();
    else leaveDialog.current?.close();
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [reference, setReference] = useState("");
  const [noteText, setNoteText] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const drag = useRef<{ id?: string; x: number; y: number; startX: number; startY: number } | null>(null);
  const mutation = useMutation({ mutationFn: (snapshot: BoardSnapshot) => saveBoard(caseId, snapshot), onSuccess: snapshot => {
    setDraft(snapshot); setDirty(false); client.setQueryData(["investigation", caseId], snapshot); void client.invalidateQueries({ queryKey: ["progress", caseId] });
  } });
  const board = draft.board;
  const busy = mutation.isPending;
  const sources = [...people.map(p => ({ id: `person:${p.id}`, title: p.name, description: p.role, url: `../people/${encodeURIComponent(p.id)}` })),
    ...evidence.map(e => ({ id: `evidence:${e.id}`, title: e.title, description: e.kind, url: `../evidence/${encodeURIComponent(e.id)}` })),
    ...board.notes.map(n => ({ id: `note:${n.id}`, title: "Eget notat", description: n.text, url: "" }))];
  const source = (id: string) => sources.find(s => s.id === id);
  const edit = (update: (current: BoardState) => BoardState) => { if (!busy) { setDraft(current => current ? { ...current, board: update(current.board) } : current); setDirty(true); mutation.reset(); } };
  const positionForNewCard = () => ({ x: 40 + (board.positions.length % 3) * 240, y: 40 + Math.floor(board.positions.length / 3) * 150 });
  const addReference = () => { if (reference && !board.positions.some(p => p.id === reference)) edit(current => ({ ...current, positions: [...current.positions, { id: reference, ...positionForNewCard() }] })); };
  return <>
    <dialog ref={leaveDialog} className="document-dialog" aria-label="Ulagrede endringer" onCancel={event => { event.preventDefault(); if (blocker.state === "blocked") blocker.reset(); }}>
      <h2>Du har ulagrede endringer</h2><p>Fortsett å redigere for å lagre tavlen, eller forlat siden uten å lagre.</p><div className="document-toolbar"><button onClick={() => { if (blocker.state === "blocked") blocker.reset(); }}>Fortsett å redigere</button><button onClick={() => { if (blocker.state === "blocked") blocker.proceed(); }}>Forlat uten å lagre</button></div>
    </dialog>
    <div className="overview-heading"><p className="eyebrow">FORBINDELSER OG HYPOTESER</p><h1>{notesOnly ? "Notater" : "Tavle"}</h1><p>Samle kildene og dine egne notater. En tegnet forbindelse er en hypotese, ikke et bevist faktum.</p></div>
    <div className="board-savebar"><button disabled={!dirty || busy} onClick={() => mutation.mutate(draft)}>{busy ? "Lagrer …" : "Lagre tavlen"}</button><span role="status">{dirty ? "Ulagrede endringer" : "Lagret"}</span>
      <button disabled={busy} onClick={async () => {
        if (dirty && !window.confirm("Ulagrede endringer vil bli forkastet. Vil du hente den lagrede tavlen?")) return;
        const fresh = await reload(); if (fresh) { setDraft(fresh); setDirty(false); mutation.reset(); }
      }}>Hent lagret versjon</button>
    </div>
    {mutation.isError && <p className="save-error" role="alert">{mutation.error.message}</p>}
    <div className="board-workspace"><section className="board-tools">{!notesOnly && <fieldset disabled={busy}>
      <legend>Fest en kilde</legend><label>Kilde<select aria-label="Kilde" value={reference} onChange={event => setReference(event.target.value)}><option value="">Velg en kilde</option>{sources.filter(s => !s.id.startsWith("note:") && !board.positions.some(p => p.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
      <button disabled={!reference || board.positions.length >= 128 || board.positions.some(p => p.id === reference)} onClick={addReference}>Fest til tavlen</button>
    </fieldset>}<fieldset disabled={busy}><legend>Eget notat</legend><label>Notattekst<textarea value={noteText} maxLength={3000} onChange={event => setNoteText(event.target.value)} rows={4}/></label><button disabled={!noteText.trim() || board.notes.length >= 20 || board.positions.length >= 128} onClick={() => {
      const id = crypto.randomUUID(); edit(current => ({ ...current, notes: [...current.notes, { id, text: noteText.trim() }], positions: notesOnly ? current.positions : [...current.positions, { id: `note:${id}`, ...positionForNewCard() }] })); setNoteText("");
    }}>Legg til notat</button></fieldset>
    {!notesOnly && <fieldset disabled={busy}><legend>Koble to kort</legend><label>Fra<select aria-label="Fra" value={from} onChange={event => setFrom(event.target.value)}><option value="">Velg kort</option>{board.positions.map(p => <option key={p.id} value={p.id}>{source(p.id)?.title ?? "Ukjent kilde"}{p.id.startsWith("note:") ? `: ${source(p.id)?.description.slice(0, 30)}` : ""}</option>)}</select></label>
      <label>Til<select aria-label="Til" value={to} onChange={event => setTo(event.target.value)}><option value="">Velg kort</option>{board.positions.map(p => <option key={p.id} value={p.id}>{source(p.id)?.title ?? "Ukjent kilde"}{p.id.startsWith("note:") ? `: ${source(p.id)?.description.slice(0, 30)}` : ""}</option>)}</select></label>
      <label>Beskrivelse<input value={label} maxLength={120} onChange={event => setLabel(event.target.value)}/></label>
      <button disabled={!canConnect(board, from, to)} onClick={() => edit(current => ({ ...current, connections: [...current.connections, { id: crypto.randomUUID(), fromId: from, toId: to, label: label.trim() || "Mulig sammenheng" }] }))}>Opprett forbindelse</button>
    </fieldset>}<p className="map-caption">Lagres for denne nettleseren. Hvis du sletter nettstedsdata, mister du tilgangen til den anonyme lagringen. Trykk «Lagre tavlen» før du forlater siden.</p></section>
    <section className="board-area">{!notesOnly && <><div className="map-toolbar"><button aria-label="Zoom ut på tavlen" disabled={zoom <= .5} onClick={() => setZoom(z => Math.max(.5, z - .25))}>−</button><span>{Math.round(zoom * 100)} %</span><button aria-label="Zoom inn på tavlen" disabled={zoom >= 1.5} onClick={() => setZoom(z => Math.min(1.5, z + .25))}>+</button><button onClick={() => { setZoom(1); setPan({ x: 20, y: 20 }); }}>Tilpass tavlen</button></div>
      <div className="board-viewport" aria-label="Etterforskningstavle" onPointerDown={event => {
        if ((event.target as Element).closest("[data-board-card]")) return;
        event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, startX: pan.x, startY: pan.y };
      }} onPointerMove={event => {
        const d = drag.current; if (!d) return;
        if (d.id) { if (!busy) edit(current => ({ ...current, positions: current.positions.map(p => p.id === d.id ? { ...p, x: Math.max(0, Math.min(5000, d.startX + (event.clientX - d.x) / zoom)), y: Math.max(0, Math.min(5000, d.startY + (event.clientY - d.y) / zoom)) } : p) })); }
        else setPan({ x: d.startX + event.clientX - d.x, y: d.startY + event.clientY - d.y });
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="board-surface" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className="board-lines" width="5400" height="5400" aria-hidden="true">{board.connections.map(c => {
            const a = board.positions.find(p => p.id === c.fromId); const b = board.positions.find(p => p.id === c.toId); if (!a || !b) return null;
            return <g key={c.id}><line x1={a.x + 95} y1={a.y + 50} x2={b.x + 95} y2={b.y + 50} stroke="#8b9ba5" strokeWidth="2"/><text x={(a.x + b.x) / 2 + 95} y={(a.y + b.y) / 2 + 42}>{c.label}</text></g>;
          })}</svg>
          {board.positions.map(p => <article key={p.id} data-board-card className={`board-card ${p.id.startsWith("note:") ? "board-note" : ""}`} style={{ left: p.x, top: p.y }}>
            <button className="board-drag" disabled={busy} aria-label={`Flytt ${source(p.id)?.title ?? "kort"}`} onPointerDown={event => {
              if (busy) return; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: p.id, x: event.clientX, y: event.clientY, startX: p.x, startY: p.y };
            }} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); edit(current => ({ ...current, positions: current.positions.map(point => point.id === p.id ? { ...point, x: Math.max(0, Math.min(5000, point.x + (event.key === "ArrowRight" ? 10 : event.key === "ArrowLeft" ? -10 : 0))), y: Math.max(0, Math.min(5000, point.y + (event.key === "ArrowDown" ? 10 : event.key === "ArrowUp" ? -10 : 0))) } : point) })); }}>Flytt · bruk piltastene</button>
            <h2>{source(p.id)?.title ?? "Kilden er ikke tilgjengelig"}</h2><p>{source(p.id)?.description}</p><div>{source(p.id)?.url && <Link to={source(p.id)!.url}>Åpne kilde</Link>}<button disabled={busy} onClick={() => edit(current => removeCard(current, p.id))}>Ta av tavlen</button></div>
          </article>)}
        </div>
        {board.positions.length === 0 && <p className="board-empty">Fest en kilde eller legg til et notat for å begynne.</p>}
      </div>
      <p className="map-caption">Dra i bakgrunnen for å flytte visningen. Dra i kortets toppfelt for å flytte kortet; piltastene kan også brukes.</p>
      <section className="connection-list" aria-label="Forbindelser"><h2>Forbindelser</h2>{board.connections.length === 0 && <p>Ingen forbindelser ennå.</p>}{board.connections.map(c => <div key={c.id}><span>{source(c.fromId)?.title} — {c.label} — {source(c.toId)?.title}</span><button disabled={busy} onClick={() => edit(current => ({ ...current, connections: current.connections.filter(item => item.id !== c.id) }))}>Fjern forbindelse</button></div>)}</section></>}
      <section className="board-notes" aria-label="Egne notater"><h2>Egne notater</h2>{board.notes.map(note => <label key={note.id}>Notat<textarea disabled={busy} aria-label={`Rediger notat ${note.text.slice(0, 30)}`} maxLength={3000} value={note.text} onChange={event => edit(current => ({ ...current, notes: current.notes.map(n => n.id === note.id ? { ...n, text: event.target.value } : n) }))}/></label>)}</section>
    </section></div>
  </>;
}
