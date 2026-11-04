import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchJson } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isPeople, type Person } from "./api";

export function PeoplePage() {
  const { caseId, personId } = useParams();
  const query = useQuery({ queryKey: ["cases", caseId, "people"], queryFn: ({ signal }) => fetchJson<Person[]>(`/api/cases/${encodeURIComponent(caseId ?? "")}/people`, signal, isPeople) });
  if (query.isPending || query.isError) return <Feedback error={query.error} retry={() => { void query.refetch(); }} />;
  const selected = query.data.find(person => person.id === personId);
  return <>
    <div className="overview-heading"><p className="eyebrow">SAKSREGISTER</p><h1>Personer</h1><p>Opplysninger fra den opprinnelige saken. Alder er oppgitt for 1999.</p></div>
    <div className="people-workspace"><section aria-label="Personregister" className="people-list">
      {query.data.length === 0 && <p>Ingen personer er registrert.</p>}
      {query.data.map(person => <Link aria-current={person.id === personId ? "page" : undefined} className="person-card" key={person.id} to={`../people/${encodeURIComponent(person.id)}`}>
        <span className="monogram" aria-hidden="true">{person.name.split(" ").map(part => part[0]).join("")}</span><span><strong>{person.name}</strong><small>{person.role}</small></span><span aria-hidden="true">↗</span>
      </Link>)}
    </section><section className="person-detail" aria-live="polite">
      {selected ? <><p className="eyebrow">PERSONOPPLYSNINGER / 1999</p><h2>{selected.name}</h2><p>{selected.role} · {selected.age} år</p><hr/><p>{selected.introduction}</p><p className="report-note">En tilknytning til saken sier ikke i seg selv noe om ansvar.</p></> : <><h2>{personId ? "Personen finnes ikke i denne saken." : "Velg en person"}</h2><p>Åpne en oppføring for å lese opplysningene i arkivet.</p></>}
    </section></div>
  </>;
}
