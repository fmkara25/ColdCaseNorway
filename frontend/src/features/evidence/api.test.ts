import { expect, it } from "vitest";
import { isEvidenceList } from "./api";
import { useReviewStore } from "../investigation/reviewStore";

it("requires readable evidence fields", () => {
  expect(isEvidenceList([])).toBe(true);
  expect(isEvidenceList([{ id: "ticket", title: "Billett", kind: "Dokument", source: "Arkiv", body: "Ikke brukt." }])).toBe(true);
  expect(isEvidenceList([{ id: "ticket", body: null }])).toBe(false);
});
it("keeps reading marks unique and scoped to their case", () => {
  useReviewStore.setState({ reviewed: {} });
  useReviewStore.getState().markReviewed("case-a", "ticket");
  useReviewStore.getState().markReviewed("case-a", "ticket");
  expect(useReviewStore.getState().reviewed["case-a"]).toEqual(["ticket"]);
  expect(useReviewStore.getState().reviewed["case-b"]).toBeUndefined();
});
