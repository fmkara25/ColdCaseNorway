import { useEffect, useRef } from "react";

// Never render exception messages, stack traces, API payloads or hidden case material.
// Expected API errors retain their existing in-page retry feedback.
export function RouteError() {
  const main = useRef<HTMLElement>(null);
  useEffect(() => { main.current?.focus(); }, []);
  return <main ref={main} id="main-content" tabIndex={-1} className="feedback" aria-labelledby="route-error-title">
    <h1 id="route-error-title">Noe gikk galt med visningen.</h1>
    <p>Siden kunne ikke vises. Prøv å laste den inn på nytt.</p>
    <p>Lagrede opplysninger blir ikke slettet. Ulagrede endringer kan gå tapt.</p>
    <div className="recovery-actions"><button onClick={() => window.location.reload()}>Last inn på nytt</button><a href="/">Til saksarkivet</a></div>
  </main>;
}
