import type { Evidence } from "./api";
import type { Person } from "../people/api";

export interface ComparisonSource { id:string; title:string; kind:string; source:string; body:string; evidence?:Evidence; person?:Person }
export function comparisonSources(evidence: Evidence[], people: Person[]): ComparisonSource[] {
  return [...evidence.map(item => ({ id:`evidence:${item.id}`, title:item.title, kind:item.kind, source:item.source, body:item.body, evidence:item })),
    ...people.map(person => ({ id:`person:${person.id}`, title:person.name, kind:"Personopplysninger", source:person.role, body:person.introduction, person }))];
}
