import type { ActionHistory } from "../investigation/progress";
import type { Evidence } from "./api";
import type { Person } from "../people/api";

export interface ComparisonSource { id:string; title:string; kind:string; source:string; body:string; evidence?:Evidence; person?:Person }
export function comparisonSources(evidence: Evidence[], people: Person[], history: ActionHistory[] = []): ComparisonSource[] {
  return [...evidence.map(item => ({ id:`evidence:${item.id}`, title:item.title, kind:item.kind, source:item.source, body:item.body, evidence:item })),
    ...people.map(person => {
      const entries = history.filter(entry => entry.personId === person.id);
      const body = entries.length ? `${person.introduction}\n\nREGISTRERTE FORKLARINGER\n\n${entries.map(entry => `${entry.label}\n${entry.approach ? `Din tilnærming: ${entry.approach.label}\n` : ""}${entry.response}`).join("\n\n")}` : person.introduction;
      return { id:`person:${person.id}`, title:person.name, kind:entries.length ? "Personopplysninger og samtalehistorikk" : "Personopplysninger", source:person.role, body, person };
    })];
}
