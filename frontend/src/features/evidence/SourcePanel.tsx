import { ArchiveImage } from "../../components/ArchiveImage";
import type { ComparisonSource } from "./comparisonSources";

export function SourcePanel({ item, label, zoom = 100, review, reviewed = false, busy = false }: {
  item:ComparisonSource; label:string; zoom?:number; review?:() => void; reviewed?:boolean; busy?:boolean;
}) {
  return <section className="source-window" aria-label={label}>
    <header className="source-window-heading"><span>{item.kind}</span>{review && <button disabled={busy || reviewed} onClick={review} aria-label={`Ta med ${item.title} i vurderingen`}>{reviewed ? "Tatt med i vurderingen" : "Ta med i vurderingen"}</button>}</header>
    <div className="source-window-scroll" tabIndex={0} role="region" aria-label={`Innhold: ${item.title}`}>
      <article className={`source-sheet ${item.evidence ? "evidence-document" : "person-source"}`} style={{ fontSize:`${zoom}%` }}>
        {item.person && <ArchiveImage src={item.person.portraitImagePath} name={item.person.name} />}
        <span className="source-origin">{item.source}</span><h2 tabIndex={-1}>{item.title}</h2><div className="document-body">{item.body}</div>
        <p className="source-caution">Vurder opplysningene sammen med andre kilder.</p>
      </article>
    </div>
  </section>;
}
