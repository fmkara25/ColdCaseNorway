import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { fetchJson, isCaseFile, type CaseFile } from "./api";
import { Feedback } from "./CasePages";

export function CaseLayout() {
  const { caseId } = useParams();
  const query = useQuery({ queryKey: ["cases", caseId], queryFn: ({ signal }) => fetchJson<CaseFile>(`/api/cases/${encodeURIComponent(caseId ?? "")}`, signal, isCaseFile) });
  return <div className="workstation">
    <aside><Link className="brand" to="/">COLD CASE<br/><span>NORWAY</span></Link>
      <p className="eyebrow">ARBEIDSOMRÅDE</p>
      <nav aria-label="Saksverktøy">
        <NavLink end to={`/cases/${encodeURIComponent(caseId ?? "")}`} className={({ isActive }) => isActive ? "nav-active" : ""}>OVERSIKT</NavLink>
        <NavLink to="people" className={({ isActive }) => isActive ? "nav-active" : ""}>PERSONER</NavLink>
        <NavLink to="evidence" className={({ isActive }) => isActive ? "nav-active" : ""}>BEVIS</NavLink>
        <NavLink to="timeline" className={({ isActive }) => isActive ? "nav-active" : ""}>TIDSLINJE</NavLink>
        <NavLink to="map" className={({ isActive }) => isActive ? "nav-active" : ""}>KART</NavLink>
        <NavLink to="board" className={({ isActive }) => isActive ? "nav-active" : ""}>TAVLE</NavLink>
        <NavLink to="notes" className={({ isActive }) => isActive ? "nav-active" : ""}>NOTATER</NavLink>
      </nav><Link className="back-link" to="/">← Saksarkiv</Link>
    </aside>
    <main className="workspace"><header className="workspace-header"><span>SAK / {caseId}</span><span className="status">Uoppklart</span></header>
      {query.isPending || query.isError ? <Feedback error={query.error} retry={() => { void query.refetch(); }} /> : <Outlet context={query.data} />}
    </main>
  </div>;
}
