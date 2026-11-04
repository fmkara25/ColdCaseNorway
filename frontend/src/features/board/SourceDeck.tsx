import { useState } from "react";
import { ArchiveImage } from "../../components/ArchiveImage";
import type { Person } from "../people/api";
import type { Evidence } from "../evidence/api";

export function SourceDeck({ people, evidence, pinned, disabled, pin }: { people:Person[]; evidence:Evidence[]; pinned:ReadonlySet<string>; disabled:boolean; pin:(id:string) => void }) {
  const [kind, setKind] = useState<"person" | "evidence">("person");
  const [page, setPage] = useState(0);
  const sources = kind === "person" ? people.map(item => ({ id:`person:${item.id}`, title:item.name, kind:item.role, portrait:item.portraitImagePath })) : evidence.map(item => ({ id:`evidence:${item.id}`, title:item.title, kind:item.kind, portrait:undefined }));
  const count = Math.max(1, Math.ceil(sources.length / 4));
  const current = Math.min(page, count - 1);
  return <section className="board-source-deck" aria-label="Kildekort"><p className="eyebrow">FEST DET DU VIL UNDERSØKE</p><h2>Velg et kort</h2><div className="board-source-filters"><button aria-pressed={kind === "person"} onClick={() => { setKind("person"); setPage(0); }}>Personer</button><button aria-pressed={kind === "evidence"} onClick={() => { setKind("evidence"); setPage(0); }}>Dokumenter</button></div>
    <div className="board-source-cards">{sources.slice(current * 4, current * 4 + 4).map(item => <button key={item.id} disabled={disabled || pinned.has(item.id)} onClick={() => pin(item.id)} aria-label={`Fest ${item.title} til tavlen`}>
      {kind === "person" ? <ArchiveImage src={item.portrait} name={item.title} compact/> : <span className="board-file-icon" aria-hidden="true">▤</span>}<span><strong>{item.title}</strong><small>{pinned.has(item.id) ? "Festet til tavlen" : item.kind}</small></span><span aria-hidden="true">{pinned.has(item.id) ? "✓" : "+"}</span>
    </button>)}</div>
    {!sources.length && <p>Ingen kilder er tilgjengelige her.</p>}
    <div className="board-deck-pagination"><button aria-label="Forrige kildekort" disabled={!current} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {count}</span><button aria-label="Neste kildekort" disabled={current >= count - 1} onClick={() => setPage(current + 1)}>→</button></div>
  </section>;
}
