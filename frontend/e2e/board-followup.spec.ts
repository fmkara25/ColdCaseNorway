import { expect, test } from "@playwright/test";

test("a saved hypothesis offers its newly available question without asking it automatically", async ({ page }, testInfo) => {
  const session = "/api/cases/1999-1218/investigation";
  const headers = { "X-ColdCase-Request":"1" };
  for (const path of ["", "/evidence/hotel-log/review", "/evidence/maria-statement/review", "/actions/find-note", "/evidence/ingrid-note/review"]) {
    const response = await page.request.post(session + path, { headers, data:{} }); expect(response.ok(), await response.text()).toBe(true);
  }
  const snapshot = await (await page.request.get(session)).json();
  snapshot.board.positions = [{ id:"person:maria", x:40, y:40 }, { id:"evidence:ingrid-note", x:280, y:40 }];
  expect((await page.request.put(session + "/board", { headers, data:snapshot })).ok()).toBe(true);
  const before = await (await page.request.get(session + "/progress")).json();
  await page.goto("/cases/1999-1218/board");
  await page.getByRole("button", { name:"Koblinger", exact:true }).click();
  await page.getByLabel("Fra", { exact:true }).selectOption("person:maria");
  await page.getByLabel("Til", { exact:true }).selectOption("evidence:ingrid-note");
  await page.getByRole("button", { name:"Opprett forbindelse", exact:true }).click();
  await page.getByRole("button", { name:"Lagre tavlen", exact:true }).click();
  const receipt = page.getByRole("region", { name:"Etter lagring", exact:true });
  await expect(receipt).toContainText("Nye spor å følge opp");
  const question = receipt.getByRole("link", { name:"Spør om notatet og den avtalte bagen ↗", exact:true });
  await expect(question).toBeVisible();
  await expect(receipt).not.toContainText("Lars Viken");
  for (const size of [{width:1366,height:768},{width:390,height:844}]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => ({x:document.documentElement.scrollWidth > innerWidth,y:document.documentElement.scrollHeight > innerHeight}))).toEqual({x:false,y:false});
    await page.screenshot({ path:testInfo.outputPath(`board-followup-${size.width}.png`) });
  }
  await question.click();
  await expect(page.getByRole("button", { name:"Spør om notatet og den avtalte bagen", exact:true })).toBeVisible();
  const after = await (await page.request.get(session + "/progress")).json();
  expect(after.history).toEqual(before.history);
  expect(after.reviewedEvidenceIds).toEqual(before.reviewedEvidenceIds);
});

test("a failed followup read keeps the saved board and retries only the read", async ({ page }) => {
  await page.goto("/cases/1999-1218/notes");
  await page.getByLabel("Notattekst", { exact:true }).fill("Kontroller reiseplanen.");
  await page.getByRole("button", { name:"Legg til notat", exact:true }).click();
  let writes = 0;
  page.on("request", request => { if (request.method() === "PUT" && request.url().endsWith("/investigation/board")) writes++; });
  await page.route("**/investigation/progress", route => route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  await page.getByRole("button", { name:"Lagre tavlen", exact:true }).click();
  const receipt = page.getByRole("region", { name:"Etter lagring", exact:true });
  await expect(receipt).toContainText("Tavlen er lagret. Kunne ikke hente");
  await expect(page.getByRole("button", { name:"Lagre tavlen", exact:true })).toBeDisabled();
  await expect(page.getByLabel(/^Rediger notat Kontroller/)).toHaveValue("Kontroller reiseplanen.");
  await page.unroute("**/investigation/progress");
  await receipt.getByRole("button", { name:"Prøv å hente spor igjen", exact:true }).click();
  await expect(receipt).toContainText("Ingen nye spor akkurat nå.");
  expect(writes).toBe(1);
  await page.reload();
  await expect(page.getByLabel(/^Rediger notat Kontroller/)).toHaveValue("Kontroller reiseplanen.");
});
