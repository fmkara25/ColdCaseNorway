import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { isMapGraph, type MapGraph } from "../map/api";
import { progressCommand, useProgress } from "./progress";

export function ActionPanel({ personId = null }: { personId?: string | null }) {
  const { caseId = "" } = useParams();
  const query = useProgress(caseId);
  const client = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const actions = query.data?.actions.filter(a => a.personId === personId) ?? [];
  const history = query.data?.history.filter(a => a.personId === personId) ?? [];
  const map = useQuery({ queryKey: ["cases", caseId, "map"], enabled: actions.some(a => a.requiresRoute), queryFn: ({ signal }) => fetchJson<MapGraph>(`/api/cases/${encodeURIComponent(caseId)}/map`, signal, isMapGraph) });
  const mutation = useMutation({ mutationFn: ({ id, route }: { id: string; route?: string[] }) => progressCommand(caseId, `actions/${encodeURIComponent(id)}`, route),
    onSuccess: async progress => {
      client.setQueryData(["progress", caseId], progress);
      await Promise.all([client.invalidateQueries({ queryKey: ["cases", caseId] }), client.invalidateQueries({ queryKey: ["investigation", caseId] })]);
    } });
  if (personId && query.isSuccess && actions.length === 0 && history.length === 0) return null;
  return <section className="action-panel" aria-label={personId ? "Oppfølgingssamtale" : "Videre undersøkelser"}>
    <p className="eyebrow">{personId ? "OPPFØLGINGSSAMTALE" : "ARBEID VIDERE"}</p><h2>{personId ? "Spørsmål og forklaringer" : "Undersøkelser"}</h2>
    <p>Gjennomgå dokumentene og lagre relevante forbindelser på <Link to={`/cases/${encodeURIComponent(caseId)}/board`}>tavlen</Link>. Nye spor og spørsmål blir tilgjengelige når du har grunnlag for dem.</p>
    {query.isPending && <p role="status">Åpner etterforskningen …</p>}
    {(query.isError || mutation.isError) && <div role="alert"><p>{mutation.error?.message ?? "Kunne ikke hente etterforskningen."}</p><button onClick={() => { mutation.reset(); void query.refetch(); }}>Oppdater opplysningene</button></div>}
    {!query.isPending && !query.isError && actions.length === 0 && <p>Ingen nye undersøkelser er tilgjengelige her ennå.</p>}
    {actions.map(action => <div className="action-option" key={action.id}>
      {action.requiresRoute && <><p>Velg ruten du vil bruke i vurderingen. Sammenlign stedene og klokkeslettene i kildene.</p>
        {map.isError && <p role="alert">Kunne ikke hente stedene. Åpne kartet og prøv igjen.</p>}
        <label>Fra sted<select aria-label="Fra sted" value={from} onChange={e => setFrom(e.target.value)}><option value="">Velg startsted</option>{map.data?.locations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Til sted<select aria-label="Til sted" value={to} onChange={e => setTo(e.target.value)}><option value="">Velg mål</option>{map.data?.locations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </>}
      <button disabled={mutation.isPending || (action.requiresRoute && (!from || !to || from === to))} onClick={() => mutation.mutate({ id: action.id, route: action.requiresRoute ? [from, to] : undefined })}>{action.label}</button>
    </div>)}
    <div className="action-history" aria-live="polite">{history.map(entry => <article key={entry.id}><h3>{entry.label}</h3><p>{entry.response}</p></article>)}</div>
    {history.length > 0 && <p className="map-caption">Nytt materiale finnes under Bevis, Personer, Tidslinje eller Kart. En forklaring er fortsatt en kilde som må vurderes.</p>}
  </section>;
}
