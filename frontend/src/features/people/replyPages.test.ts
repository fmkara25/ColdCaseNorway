import { expect, it } from "vitest";
import { replyPages } from "./replyPages";
it("pages authored replies without losing words, punctuation or paragraph boundaries", () => {
  for (const text of ["", "Kort svar.", "Jeg skulle ha ringt etter hjelp.\n\n".repeat(40), "x".repeat(900)]) {
    const pages = replyPages(text);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.join("")).toBe(text);
    if (text.length > 420) expect(pages.length).toBeGreaterThan(1);
  }
});
