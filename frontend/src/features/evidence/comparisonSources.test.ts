import { expect, it } from "vitest";
import { comparisonSources } from "./comparisonSources";
import type { Person } from "../people/api";
import type { ActionHistory } from "../investigation/progress";
const person:Person = { id:"maria", name:"Maria Nygård", age:23, role:"Venninne", introduction:"Arkivopplysninger", portraitImagePath:null };
const history:ActionHistory[] = [{ id:"done", personId:"maria", label:"Et stilt spørsmål", response:"Et registrert svar.\nNeste avsnitt.", approach:{ id:"open", label:"La henne forklare" } },
  { id:"other", personId:"jonas", label:"Annen samtale", response:"PRIVATE_OTHER_PERSON" },
  { id:"research", personId:null, label:"Undersøkelse", response:"RESEARCH_RESPONSE" }];
it("includes only the selected person's completed replies with the recorded approach", () => {
  const before = structuredClone(history);
  const source = comparisonSources([], [person], history)[0];
  expect(source.body).toContain(person.introduction);
  expect(source.body).toContain(history[0].response);
  expect(source.body).toContain("Din tilnærming: La henne forklare");
  expect(source.body).not.toContain("PRIVATE_OTHER_PERSON");
  expect(source.body).not.toContain("RESEARCH_RESPONSE");
  expect(history).toEqual(before);
});
it("does not invent a reply or approach for a person without completed history", () => {
  expect(comparisonSources([], [person])[0].body).toBe(person.introduction);
  const legacy = comparisonSources([], [person], [{ ...history[0], approach:undefined }])[0];
  expect(legacy.body).toContain(history[0].response); expect(legacy.body).not.toContain("Din tilnærming");
});
it("leaves evidence text unchanged when conversation history is present", () => {
  const evidence = { id:"ticket", title:"Billett", kind:"Dokument", source:"Arkiv", body:"Uendret kilde" };
  expect(comparisonSources([evidence], [person], history)[0].body).toBe("Uendret kilde");
});
