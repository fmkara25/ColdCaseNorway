import { RouteFrame } from "./RouteFrame";
import { RouteError } from "./RouteError";
import { createBrowserRouter, Link } from "react-router-dom";
import { CaseLayout } from "../features/cases/CaseLayout";
import { PeoplePage } from "../features/people/PeoplePage";
import { EvidencePage } from "../features/evidence/EvidencePage";
import { TimelinePage } from "../features/timeline/TimelinePage";
import { MapPage } from "../features/map/MapPage";
import { BoardPage } from "../features/board/BoardPage";
import { ReconstructionPage } from "../features/reconstruction/ReconstructionPage";
import { OpeningPage } from "../features/opening/OpeningPage";
import App from "../App";
import { CaseOverview } from "../features/cases/CasePages";

export const router = createBrowserRouter([{ element: <RouteFrame />, errorElement: <RouteError />, children: [
  { path: "/", element: <App /> },
  { path: "/cases/:caseId", element: <CaseLayout />, children: [
    { index: true, element: <CaseOverview /> },
    { path: "opening", element: <OpeningPage /> },
    { path: "notes", element: <BoardPage notesOnly /> },
    { path: "reconstruction", element: <ReconstructionPage /> },
    { path: "board", element: <BoardPage /> },
    { path: "map", element: <MapPage /> },
    { path: "timeline", element: <TimelinePage /> },
    { path: "evidence", element: <EvidencePage /> },
    { path: "evidence/:evidenceId", element: <EvidencePage /> },
    { path: "people", element: <PeoplePage /> },
    { path: "people/:personId", element: <PeoplePage /> },
  ] },
  { path: "*", element: <main id="main-content" tabIndex={-1} className="feedback"><h1>Siden finnes ikke.</h1><Link to="/">Til saksarkivet</Link></main> },
] }]);
