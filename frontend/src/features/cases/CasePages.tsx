import { useQuery } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, isCaseList, fetchJson, formatDate, type CaseFile, type CaseSummary } from "./api";

export function Feedback({ error, retry }: { error?: Error | null; retry: () => void }) {
  return <section className="feedback" role={error ? "alert" : "status"}>
    <h2>{error ? (error instanceof ApiError ? error.message : "Ingen forbindelse til saksarkivet.") : "Henter saksopplysninger …"}</h2>
    {error instanceof ApiError && error.status === 404 ? <Link to="/">Til saksarkivet</Link> : error && <><p>Kontroller forbindelsen og prøv igjen.</p><button onClick={retry}>Prøv igjen</button></>}
  </section>;
}

export function CaseArchive() {
  const query = useQuery({ queryKey: ["cases"], queryFn: ({ signal }) => fetchJson<CaseSummary[]>("/api/cases", signal, isCaseList) });
  return <main className="archive">
    <header className="masthead"><Link to="/">COLD CASE <span>NORWAY</span></Link><span>ETTERFORSKNINGSARKIV</span></header>
    <div className="archive-heading"><p className="eyebrow">GJENÅPNEDE SAKER</p><h1>Det som ennå ikke er forklart.</h1><p>Gå tilbake til kildene. Undersøk sporene. Bygg en forklaring.</p></div>
    {query.isPending || query.isError ? <Feedback error={query.error} retry={() => { void query.refetch(); }} /> :
      query.data.length === 0 ? <p>Ingen saker er tilgjengelige.</p> : <div className="case-list">{query.data.map(file =>
      <article className="case-card" key={file.id}>
        <div className="archive-label" aria-hidden="true"><span>SAKSARKIV</span><strong>{file.id}</strong><span>{formatDate(file.disappearanceDate)}</span></div>
        <div className="case-content"><div className="case-meta"><span>SAK {file.id}</span><span className="status">Uoppklart</span></div>
          <h2>{file.title}</h2><p>{file.summary}</p><dl><div><dt>Savnet</dt><dd>{file.missingPerson}, {file.age} år</dd></div><div><dt>Sted</dt><dd>{file.location}</dd></div><div><dt>Dato</dt><dd>{formatDate(file.disappearanceDate)}</dd></div></dl>
          <Link className="primary-button" to={`/cases/${encodeURIComponent(file.id)}`}>Åpne sak <span aria-hidden="true">↗</span></Link>
        </div>
      </article>)}</div>}
    <footer>Alle personer og hendelser i spillet er fiktive.</footer>
  </main>;
}

export function CaseOverview() {
  const file = useOutletContext<CaseFile>();
  return <>
        <div className="overview-heading"><p className="eyebrow">GJENÅPNET ETTERFORSKNING</p><h1>{file.title}</h1><p>{file.location} · {formatDate(file.disappearanceDate)}</p></div>
        <div className="overview-grid"><article className="report"><div className="report-meta"><span>ARKIVUTDRAG</span><span>{file.id}</span></div><h2>Den første vurderingen</h2><p>{file.initialReport}</p><hr/><p className="report-note">Dette er utgangspunktet for etterforskningen. Opplysningene må vurderes opp mot de øvrige kildene i saken.</p></article>
        <section className="person-summary"><p className="eyebrow">SAVNET PERSON</p><div className="monogram" aria-hidden="true">{file.missingPerson.split(" ").map(part => part[0]).join("")}</div><h2>{file.missingPerson}</h2><p>{file.age} år ved forsvinningen</p><hr/><p className="eyebrow">UTGANGSPUNKT</p><p>Hva skjedde den kvelden?</p></section></div>
  </>;
}
