import { expect, test } from "@playwright/test";

test("board saves moved cards, notes and links to PostgreSQL and isolates another browser", async ({ page, browser }, testInfo) => {
  await page.goto("/cases/1999-1218/board");
  await page.getByRole("button", { name:"Fest Ingrid Solberg til tavlen", exact:true }).click();
  await page.getByRole("button", { name:"Dokumenter", exact:true }).click();
  await page.getByRole("button", { name:"Fest Bussbillett til Trondheim til tavlen", exact:true }).click();
  await page.getByRole("button", { name:"Notater", exact:true }).click();
  await page.getByLabel("Notattekst", { exact: true }).fill("Billetten viser en plan, ikke en reise.");
  await page.getByRole("button", { name: "Legg til notat", exact: true }).click();
  await page.getByRole("button", { name:"Koblinger", exact:true }).click();
  await page.getByLabel("Fra", { exact: true }).selectOption("person:ingrid");
  await page.getByLabel("Til", { exact: true }).selectOption("evidence:bus-ticket");
  await page.getByLabel("Beskrivelse", { exact: true }).fill("Planlagt reise");
  await page.getByRole("button", { name: "Opprett forbindelse" }).click();
  const drag = page.getByRole("button", { name: "Flytt Ingrid Solberg", exact: true });
  await drag.scrollIntoViewIfNeeded();
  const box = await drag.boundingBox();
  if (!box) throw new Error("Card is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  const card = page.locator(".board-card").filter({ has: page.getByRole("heading", { name: "Ingrid Solberg", exact: true }) });
  await expect(card).toHaveCSS("left", "100px");
  await page.getByRole("button", { name: "Lagre tavlen", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Lagret$/ })).toBeVisible();
  await page.screenshot({ path:testInfo.outputPath("board-linked-cards.png") });
  await page.reload();
  await page.getByRole("button", { name:"Notater", exact:true }).click();
  await expect(page.getByLabel(/^Rediger notat Billetten viser/)).toBeVisible();
  await page.getByRole("button", { name:"Koblinger", exact:true }).click();
  await expect(page.getByRole("region", { name: "Forbindelser", exact: true })).toContainText("Planlagt reise");
  await expect(page.locator(".board-card").filter({ has: page.getByRole("heading", { name: "Ingrid Solberg", exact: true }) })).toHaveCSS("left", "100px");
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/cases/1999-1218/board");
  await expect(otherPage.getByText("Fest en kilde eller legg til et notat for å begynne.")).toBeVisible();
  await otherPage.getByRole("button", { name:"Notater", exact:true }).click();
  await expect(otherPage.locator(".board-notes textarea")).toHaveCount(0);
  await other.close();
});

test("leaving an unsaved board requires an explicit choice", async ({ page }) => {
  await page.goto("/cases/1999-1218/board");
  await page.getByRole("button", { name:"Notater", exact:true }).click();
  await page.getByLabel("Notattekst", { exact: true }).fill("Ulagret hypotese");
  await page.getByRole("button", { name: "Legg til notat", exact: true }).click();
  await page.getByText("Mappen", { exact:true }).click();
  await page.getByRole("link", { name: "OVERSIKT", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ulagrede endringer" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fortsett å redigere" }).click();
  await expect(page.getByLabel("Rediger notat Ulagret hypotese")).toHaveValue("Ulagret hypotese");
});

test("notes can be edited separately without requiring a pinned card", async ({ page }) => {
  await page.goto("/cases/1999-1218/notes");
  await expect(page.getByRole("heading", { name: "Notater", exact: true })).toBeVisible();
  await page.getByLabel("Notattekst", { exact: true }).fill("Sammenlign tidsopplysningene.");
  await page.getByRole("button", { name: "Legg til notat", exact: true }).click();
  await page.getByRole("button", { name: "Lagre tavlen", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Lagret$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Rediger notat Sammenlign/)).toHaveValue("Sammenlign tidsopplysningene.");
});


test("board and notes keep their workspace fixed across viewport sizes", async ({ page }, testInfo) => {
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218/board");
    await expect(page.getByRole("region", { name:"Kildekort", exact:true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Lars Viken");
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    const bounds = await page.locator(".board-workspace").boundingBox(); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height - 40);
    await page.screenshot({ path:testInfo.outputPath(`board-${size.width}.png`) });
    await page.goto("/cases/1999-1218/notes");
    await page.getByLabel("Notattekst", { exact:true }).fill("Undersøk kildenes presisjon.");
    await page.getByRole("button", { name:"Legg til notat", exact:true }).click();
    await page.getByRole("button", { name:"Lagre tavlen", exact:true }).click();
    await expect(page.getByRole("status").filter({ hasText:/^Lagret$/ })).toBeVisible();
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    await page.screenshot({ path:testInfo.outputPath(`notes-${size.width}.png`) });
  }
});

test("visible cards choose connection endpoints and keyboard pan does not edit saved coordinates", async ({ page }) => {
  await page.goto("/cases/1999-1218/board");
  await page.getByRole("button", { name:"Fest Ingrid Solberg til tavlen", exact:true }).click();
  await page.getByRole("button", { name:"Dokumenter", exact:true }).click();
  await page.getByRole("button", { name:"Fest Bussbillett til Trondheim til tavlen", exact:true }).click();
  await page.getByRole("button", { name:"Koble Ingrid Solberg", exact:true }).click();
  await page.getByRole("button", { name:"Koble Bussbillett til Trondheim", exact:true }).click();
  await expect(page.getByLabel("Fra", { exact:true })).toHaveValue("person:ingrid");
  await expect(page.getByLabel("Til", { exact:true })).toHaveValue("evidence:bus-ticket");
  await page.getByLabel("Beskrivelse", { exact:true }).fill("Undersøk reiseplanen");
  await page.getByRole("button", { name:"Opprett forbindelse", exact:true }).click();
  await expect(page.getByRole("region", { name:"Forbindelser", exact:true })).toContainText("Undersøk reiseplanen");
  await page.locator(".board-viewport").focus(); await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".board-surface")).toHaveAttribute("style", /translate\(60px, 20px\)/);
  await page.getByRole("button", { name:"Lagre tavlen", exact:true }).click();
  await expect(page.getByRole("status").filter({ hasText:/^Lagret$/ })).toBeVisible();
  const saved = await (await page.request.get("/api/cases/1999-1218/investigation")).json();
  expect(saved.board.positions.map((item:{x:number}) => item.x)).toEqual([40,280]);
  expect(saved.board.connections).toHaveLength(1);
});

test("failed refresh preserves a conflicted note draft until an explicit successful reload", async ({ page }) => {
  const session = "/api/cases/1999-1218/investigation";
  await page.goto("/cases/1999-1218/notes");
  await page.getByLabel("Notattekst", { exact:true }).fill("Første versjon");
  await page.getByRole("button", { name:"Legg til notat", exact:true }).click();
  await page.getByRole("button", { name:"Lagre tavlen", exact:true }).click();
  await expect(page.getByRole("status").filter({ hasText:/^Lagret$/ })).toBeVisible();
  const changed = await (await page.request.get(session)).json(); changed.board.notes[0].text = "Endret i annen fane";
  expect((await page.request.put(session + "/board", { headers:{ "X-ColdCase-Request":"1" }, data:changed })).ok()).toBe(true);
  await page.getByLabel(/^Rediger notat/).fill("Mitt lokale utkast");
  await page.getByRole("button", { name:"Lagre tavlen", exact:true }).click();
  await expect(page.getByRole("alert")).toContainText("annen fane");
  await page.route("**/investigation", route => route.fulfill({ status:503, body:"{}" }));
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name:"Hent lagret versjon", exact:true }).click();
  await expect(page.getByRole("alert")).toContainText("Utkastet ditt er beholdt");
  await expect(page.getByLabel(/^Rediger notat/)).toHaveValue("Mitt lokale utkast");
  await page.unroute("**/investigation");
  await page.getByRole("button", { name:"Hent lagret versjon", exact:true }).click();
  await expect(page.getByLabel(/^Rediger notat/)).toHaveValue("Endret i annen fane");
  await expect(page.getByRole("status").filter({ hasText:/^Lagret$/ })).toBeVisible();
});

test("note text not yet added to the board is protected by the leave guard", async ({ page }) => {
  await page.goto("/cases/1999-1218/notes");
  await page.getByLabel("Notattekst", { exact:true }).fill("Ikke lagt til ennå");
  await expect(page.getByRole("status")).toContainText("Tekst ikke lagt til");
  await page.getByRole("link", { name:"↖ Til skrivebordet", exact:true }).click();
  const guard = page.getByRole("dialog", { name:"Ulagrede endringer", exact:true }); await expect(guard).toBeVisible();
  await guard.getByRole("button", { name:"Fortsett å redigere", exact:true }).click();
  await expect(page.getByLabel("Notattekst", { exact:true })).toHaveValue("Ikke lagt til ennå");
});
