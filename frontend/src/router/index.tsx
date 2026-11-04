import { createBrowserRouter, Link } from "react-router-dom";
import App from "../App";
import { CaseOverview } from "../features/cases/CasePages";

export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/cases/:caseId", element: <CaseOverview /> },
  { path: "*", element: <main className="feedback"><h1>Siden finnes ikke.</h1><Link to="/">Til saksarkivet</Link></main> },
]);
