import { expect, it } from "vitest";
import { isArchiveImagePath } from "./imagePath";
import { isCaseFile } from "../features/cases/api";
import { isPeople } from "../features/people/api";
it("accepts optional bundled illustrations and rejects remote or traversing sources", () => {
  for (const path of [null, undefined, "/images/ingrid-1999.webp", "/images/case-two/cover.webp"]) expect(isArchiveImagePath(path)).toBe(true);
  for (const path of ["https://example.org/portrait.webp", "//example.org/x.webp", "/images/../secret.webp", "/images/x.webp?track=1", "data:image/png;base64,x", 42]) {
    expect(isArchiveImagePath(path)).toBe(false);
    expect(isPeople([{ id:"i", name:"I", age:23, role:"Savnet", introduction:"Tekst", portraitImagePath:path }])).toBe(false);
    expect(isCaseFile({ id:"1", title:"Sak", location:"By", disappearanceDate:"1999-12-18", missingPerson:"I", age:23, summary:"Sak", initialReport:"Tekst", coverImagePath:path })).toBe(false);
  }
});
