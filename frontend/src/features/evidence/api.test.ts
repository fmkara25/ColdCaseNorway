import { expect, it } from "vitest";
import { isEvidenceList } from "./api";

it("requires readable evidence fields", () => {
  expect(isEvidenceList([])).toBe(true);
  expect(isEvidenceList([{ id: "ticket", title: "Billett", kind: "Dokument", source: "Arkiv", body: "Ikke brukt." }])).toBe(true);
  expect(isEvidenceList([{ id: "ticket", body: null }])).toBe(false);
});
