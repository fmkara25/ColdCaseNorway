import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ApiError, fetchJson, formatDate, type CaseFile, type CaseSummary } from "./api";

function Feedback({ error, retry }: { error?: Error | null; retry: () => void }) {
  return <section className="feedback" role={error ? "alert" : "status"}>
    <h2>{error ? (error instanceof ApiError ? error.message : "Ingen forbindelse til saksarkivet.") : "Henter saksopplysninger …"}</h2>
    {error && <><p>Kontroller forbindelsen og prøv igjen.</p><button onClick={retry}>Prøv igjen</button></>}
  </section>;
}

export function CaseArchive() {
  const query = useQuery({ queryKey: ["cases"], queryFn: ({ signal }) => fetchJson<CaseSummary[]>("/api/cases", signal) });
  return <main className="archive">
    <header className="masthead"><Link to="/">COLD CASE <span>NORWAY</span></Link><span>ETTERFORSKNINGSARKIV</span></header>
    <div className="archive-heading"><p className="eyebrow">GJENÅPNEDE SAKER</p><h1>Det som ennå ikke er forklart.</h1><p>Gå tilbake til kildene. Undersøk sporene. Bygg en forklaring.</p></div>
    {query.isPending || query.isError ? <Feedback error={query.error} retry={() => { void query.refetch(); }} /> :
      query.data.length === 0 ? <p>Ingen saker er tilgjengelige.</p> : <div className="case-list">{query.data.map(file =>
      <article className="case-card" key={file.id}>
        <div className="archive-label" aria-hidden="true"><span>SAKSARKIV</span><strong>{file.id}</strong><span>{formatDate(file.disappearanceDate)}</span></div>
        <div className="case-content"><div className="case-meta"><span>SAK {file.id}</span><span className="status">Uoppklart</span></div>
          <h2>{file.title}</h2><p>{file.summary}</p><dl><div><dt>Savnet</dt><dd>{file.missingPerson}, {file.age} år</dd></div><div><dt>Sted</dt><dd>{file.location}</dd></div><div><dt>Dato</dt><dd>{formatDate(file.disappearanceDate)}</dd></div></dl>
          <Link className="primary-button" to={`/cases/${file.id}`}>Åpne sak <span aria-hidden="true">↗</span></Link>
        </div>
      </article>)}</div>}
    <footer>Alle personer og hendelser i spillet er fiktive.</footer>
  </main>;
}

const sections = ["PERSONER", "BEVIS", "TIDSLINJE", "KART", "TAVLE", "NOTATER"];
export function CaseOverview() {
  const { caseId } = useParams();
  const query = useQuery({ queryKey: ["cases", caseId], queryFn: ({ signal }) => fetchJson<CaseFile>(`/api/cases/${encodeURIComponent(caseId ?? "")}`, signal) });
  return <div className="workstation">
    <aside><Link className="brand" to="/">COLD CASE<br/><span>NORWAY</span></Link><p className="eyebrow">ARBEIDSOMRÅDE</p><nav aria-label="Saksverktøy"><span className="nav-active" aria-current="page">OVERSIKT</span>{sections.map(section => <span className="nav-unavailable" key={section}>{section}<small>Kommer senere</small></span>)}</nav><Link className="back-link" to="/">← Saksarkiv</Link></aside>
    <main className="workspace"><header className="workspace-header"><span>SAK / {caseId}</span><span className="status">Uoppklart</span></header>
      {query.isPending || query.isError ? <Feedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        <div className="overview-heading"><p className="eyebrow">GJENÅPNET ETTERFORSKNING</p><h1>{query.data.title}</h1><p>{query.data.location} · {formatDate(query.data.disappearanceDate)}</p></div>
        <div className="overview-grid"><article className="report"><div className="report-meta"><span>ARKIVUTDRAG</span><span>{query.data.id}</span></div><h2>Den første vurderingen</h2><p>{query.data.initialReport}</p><hr/><p className="report-note">Dette er utgangspunktet for etterforskningen. Opplysningene må vurderes opp mot de øvrige kildene i saken.</p></article>
        <section className="person-summary"><p className="eyebrow">SAVNET PERSON</p><div className="monogram" aria-hidden="true">{query.data.missingPerson.split(" ").map(part => part[0]).join("")}</div><h2>{query.data.missingPerson}</h2><p>{query.data.age} år ved forsvinningen</p><hr/><p className="eyebrow">UTGANGSPUNKT</p><p>Hva skjedde etter at Ingrid forlot hotellet?</p></section></div>
      </>}
    </main>
  </div>;
}
