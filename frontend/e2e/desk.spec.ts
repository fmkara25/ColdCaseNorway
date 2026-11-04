import { expect, test } from "@playwright/test";

test("desk stays inside the viewport and documents enlarge in an independently scrollable inspection", async ({ page }, testInfo) => {
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size);
    await page.goto("/cases/1999-1218");
    await expect(page.getByRole("button", { name:"Undersøk Bussbillett til Trondheim", exact:true })).toBeVisible();
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    const tray = await page.getByRole("region", { name:"Neste undersøkelse" }).boundingBox();
    expect(tray!.y + tray!.height).toBeLessThanOrEqual(size.height);
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("desk-1366.png") });
    await page.getByRole("button", { name:"Undersøk Bussbillett til Trondheim", exact:true }).click();
    const dialog = page.getByRole("dialog", { name:"Undersøk dokument", exact:true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name:"Bussbillett til Trondheim", exact:true })).toBeVisible();
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("inspection-1366.png") });
    for (let i=0; i<4; i++) await dialog.getByRole("button", { name:"Større dokumenttekst" }).click();
    await expect(dialog.getByRole("button", { name:"Større dokumenttekst" })).toBeDisabled();
    const source = dialog.getByRole("region", { name:"Dokumentinnhold" });
    await source.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await source.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(false);
    await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name:"Undersøk Bussbillett til Trondheim", exact:true })).toBeFocused();
  }
});

test("desk investigations change accessible objects, persist reviewed sources and preserve spoiler gates", async ({ page }) => {
  await page.goto("/cases/1999-1218");
  async function inspectAndUse(title: string) {
    const open = page.getByRole("button", { name:`Undersøk ${title}`, exact:true });
    for (let i=0; i<3 && !(await open.isVisible()); i++) await page.getByRole("button", { name:"Neste dokumenter" }).click();
    await open.click();
    const dialog = page.getByRole("dialog", { name:"Undersøk dokument", exact:true });
    await dialog.getByRole("button", { name:"Ta med i vurderingen", exact:true }).click();
    await expect(page.getByRole("dialog", { name:"Resultat av undersøkelsen" })).toBeVisible();
    await page.getByRole("button", { name:"Fortsett ved bordet" }).click();
  }
  await inspectAndUse("Kveldsvakten på hotellet");
  await inspectAndUse("Maria: planene videre");
  await page.getByRole("button", { name:"Se gjennom Ingrids etterlatte notater Følg opp sporet" }).click();
  const result = page.getByRole("dialog", { name:"Resultat av undersøkelsen" });
  await expect(result).toContainText("Nytt materiale på bordet");
  await result.getByRole("button", { name:/Notatet til Maria/ }).click();
  await expect(page.getByRole("dialog", { name:"Undersøk dokument", exact:true })).toContainText("jeg henter bagen");
  await page.keyboard.press("Escape");
  await page.reload();
  const progress = await (await page.request.get("/api/cases/1999-1218/investigation/progress")).json();
  expect(progress.reviewedEvidenceIds).toEqual(expect.arrayContaining(["hotel-log", "maria-statement"]));
  expect(progress.history.some((item: { id:string }) => item.id === "find-note")).toBe(true);
  const evidence = await (await page.request.get("/api/cases/1999-1218/evidence")).json();
  expect(evidence.some((item: { id:string }) => item.id === "ingrid-note")).toBe(true);
  expect(evidence.some((item: { id:string }) => item.id === "lars-account")).toBe(false);
});

test("opening guidance is optional, preserves progress and links the selected source into comparison", async ({ page }, testInfo) => {
  const session = "/api/cases/1999-1218/investigation";
  await page.request.post(session, { headers:{ "X-ColdCase-Request":"1" } });
  const before = await (await page.request.get(session + "/progress")).json();
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218");
    await expect(page.getByRole("heading", { name:"Begynn med en kilde", exact:true })).toBeVisible();
    await page.getByRole("button", { name:"Les oppdraget", exact:true }).click();
    const guide = page.getByRole("dialog", { name:"Oppdraget", exact:true });
    await expect(guide.getByText("Åpne en kilde", { exact:true })).toBeVisible();
    await expect(guide).toContainText("Markeringen bekrefter ikke");
    await expect(guide).not.toContainText("Lars Viken");
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    await page.screenshot({ path:testInfo.outputPath(`opening-guide-${size.width}.png`) });
    await guide.getByRole("button", { name:"Begynn ved bordet", exact:true }).click();
    await expect(page.getByRole("button", { name:"Les oppdraget", exact:true })).toBeFocused();
  }
  const after = await (await page.request.get(session + "/progress")).json();
  expect(after.reviewedEvidenceIds).toEqual(before.reviewedEvidenceIds); expect(after.history).toEqual(before.history);
  await page.getByRole("button", { name:"Undersøk Bussbillett til Trondheim", exact:true }).click();
  await page.getByRole("link", { name:/Sammenlign med en annen kilde/ }).click();
  await expect(page.getByRole("region", { name:"Første kilde", exact:true })).toContainText("Bussbillett til Trondheim");
  await expect(page.getByRole("region", { name:"Velg andre kilde", exact:true })).toBeVisible();
});

test("review feedback reveals only newly authorized followups and lets the player choose the next research", async ({ page }, testInfo) => {
  await page.goto("/cases/1999-1218");
  async function review(title:string) {
    const source = page.getByRole("button", { name:`Undersøk ${title}`, exact:true });
    for (let i=0; i<4 && !await source.isVisible(); i++) await page.getByRole("button", { name:"Neste dokumenter", exact:true }).click();
    await source.click(); await page.getByRole("button", { name:"Ta med i vurderingen", exact:true }).click();
    await expect(page.getByRole("dialog", { name:"Resultat av undersøkelsen", exact:true })).toBeVisible();
  }
  await review("Kveldsvakten på hotellet");
  await page.getByRole("button", { name:"Fortsett ved bordet", exact:true }).click();
  await expect(page.getByRole("heading", { name:"Hva vil du sammenholde?", exact:true })).toBeVisible();
  await review("Maria: planene videre");
  const followups = page.getByRole("region", { name:"Nye oppfølgingsmuligheter", exact:true });
  await expect(followups).toContainText("Se gjennom Ingrids etterlatte notater");
  const before = await (await page.request.get("/api/cases/1999-1218/investigation/progress")).json();
  expect(before.history.some((item:{id:string}) => item.id === "find-note")).toBe(false);
  await page.screenshot({ path:testInfo.outputPath("opening-new-followup.png") });
  await followups.getByRole("button", { name:/Se gjennom Ingrids etterlatte notater/ }).click();
  const result = page.getByRole("dialog", { name:"Resultat av undersøkelsen", exact:true });
  await expect(result.getByRole("button", { name:/Notatet til Maria/ })).toBeVisible();
  await page.getByRole("button", { name:"Fortsett ved bordet", exact:true }).click(); await page.reload();
  await expect(page.getByRole("heading", { name:"Hva vil du undersøke nå?", exact:true })).toBeVisible();
});

test("promoted interview questions open the person without executing an approach", async ({ page }) => {
  const session = "/api/cases/1999-1218/investigation"; const headers = { "X-ColdCase-Request":"1" };
  async function post(path:string) { expect((await page.request.post(session + path, { headers, data:{} })).ok()).toBe(true); }
  await post(""); for (const id of ["hotel-log", "maria-statement"]) await post(`/evidence/${id}/review`);
  await post("/actions/find-note"); await post("/evidence/ingrid-note/review");
  const board = await (await page.request.get(session)).json();
  board.board.positions = [{ id:"person:maria", x:40, y:40 }, { id:"evidence:ingrid-note", x:280, y:40 }];
  board.board.connections = [{ id:"maria-note", fromId:"person:maria", toId:"evidence:ingrid-note", label:"Undersøk sammenhengen" }];
  expect((await page.request.put(session + "/board", { headers, data:board })).ok()).toBe(true);
  await page.goto("/cases/1999-1218");
  const tray = page.getByRole("region", { name:"Neste undersøkelse", exact:true });
  await tray.getByRole("link", { name:/Spør om notatet og den avtalte bagen/ }).click();
  await expect(page.getByRole("button", { name:"Spør om notatet og den avtalte bagen", exact:true })).toBeVisible();
  const progress = await (await page.request.get(session + "/progress")).json();
  expect(progress.history.some((item:{id:string}) => item.id === "maria-plan")).toBe(false);
  expect(progress.actions.some((item:{id:string}) => item.id === "maria-plan")).toBe(true);
});
