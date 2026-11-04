import { SoundControls } from "../atmosphere/SoundControls";
import { SoundProvider } from "../atmosphere/SoundProvider";
import { useProgress } from "../investigation/progress";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { fetchJson, isCaseFile, type CaseFile } from "./api";
import { Feedback } from "./CasePages";

export function CaseLayout() {
  const { caseId } = useParams();
  const { pathname } = useLocation();
  const focusedStage = /\/(?:people|evidence|timeline|map|board|notes)(?:\/|$)/.test(pathname);
  const desk = pathname.replace(/\/$/, "") === `/cases/${encodeURIComponent(caseId ?? "")}`;
  const query = useQuery({ queryKey: ["cases", caseId], queryFn: ({ signal }) => fetchJson<CaseFile>(`/api/cases/${encodeURIComponent(caseId ?? "")}`, signal, isCaseFile) });
  const progress = useProgress(caseId ?? "", query.isSuccess);
  return <SoundProvider><div className="game-frame">
    <header className="game-header"><Link className="game-brand" to="/">COLD CASE <span>NORWAY</span></Link><span className="game-case-id">SAK / {caseId}</span><SoundControls /><span className="status">{progress.data?.isReconstructed ? "Rekonstruert" : "Uoppklart"}</span></header>
    <main id="main-content" tabIndex={-1} className="game-workspace" aria-label="Etterforskningsområde"><div className={desk || focusedStage ? "desk-viewport" : "tool-viewport"}>
      {query.isPending || query.isError ? <Feedback error={query.error} retry={() => { void query.refetch(); }} /> : <Outlet context={query.data} />}
    </div></main>
    <footer className="game-footer"><Link to={`/cases/${encodeURIComponent(caseId ?? "")}`}>↖ Til skrivebordet</Link>
    <details className="game-tool-drawer" key={pathname}><summary>Mappen</summary>
      <nav aria-label="Saksverktøy">
        <NavLink end to={`/cases/${encodeURIComponent(caseId ?? "")}`} className={({ isActive }) => isActive ? "nav-active" : ""}>OVERSIKT</NavLink>
        <NavLink to="people" className={({ isActive }) => isActive ? "nav-active" : ""}>PERSONER</NavLink>
        <NavLink to="evidence" className={({ isActive }) => isActive ? "nav-active" : ""}>BEVIS</NavLink>
        <NavLink to="timeline" className={({ isActive }) => isActive ? "nav-active" : ""}>TIDSLINJE</NavLink>
        <NavLink to="map" className={({ isActive }) => isActive ? "nav-active" : ""}>KART</NavLink>
        <NavLink to="board" className={({ isActive }) => isActive ? "nav-active" : ""}>TAVLE</NavLink>
        <NavLink to="notes" className={({ isActive }) => isActive ? "nav-active" : ""}>NOTATER</NavLink>
        <NavLink to="reconstruction" className={({ isActive }) => isActive ? "nav-active" : ""}>REKONSTRUKSJON</NavLink>
      </nav>
    </details><Link className="game-archive-link" to="/">← Saksarkiv</Link></footer>
  </div></SoundProvider>;
}
