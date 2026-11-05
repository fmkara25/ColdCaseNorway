import { expect, test } from "@playwright/test";

test("evidence reader and comparison keep outer viewport fixed while source panes scroll", async ({ page }, testInfo) => {
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218/evidence");
    await page.getByRole("link", { name:"Bussbillett til Trondheim", exact:true }).click();
    await expect(page.getByRole("region", { name:"Dokumentvisning" })).toContainText("Billetten ble ikke brukt");
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("evidence-reader.png") });
    await page.getByRole("link", { name:/Sammenlign med en kilde/ }).click();
    await page.getByRole("button", { name:"Velg Samtalen kl. 21.47 som sammenligningskilde", exact:true }).click();
    const first = page.getByRole("region", { name:"Første kilde", exact:true });
    const second = page.getByRole("region", { name:"Andre kilde", exact:true });
    await expect(first).toContainText("Bussbillett til Trondheim"); await expect(second).toContainText("Samtalen kl. 21.47");
    for (let i=0; i<4; i++) await page.getByRole("button", { name:"Større sammenligningstekst", exact:true }).click();
    if (size.width === 1366) {
      for (let i=0; i<4; i++) await page.getByRole("button", { name:"Mindre sammenligningstekst", exact:true }).click();
      await page.screenshot({ path:testInfo.outputPath("source-comparison.png") });
      for (let i=0; i<4; i++) await page.getByRole("button", { name:"Større sammenligningstekst", exact:true }).click();
    }
    const pane = first.getByRole("region"); await pane.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await pane.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    const composer = await page.getByRole("region", { name:"Din hypotese" }).boundingBox();
    expect(composer!.y + composer!.height).toBeLessThanOrEqual(size.height - 40);
  }
});

test("comparing a note with a person preserves the board and opens an authorized interview", async ({ page, browser, baseURL }, testInfo) => {
  const session = "/api/cases/1999-1218/investigation"; const headers = { "X-ColdCase-Request":"1" };
  async function post(path:string) { const response = await page.request.post(session + path, { headers, data:{} }); expect(response.ok()).toBe(true); }
  await post(""); for (const id of ["hotel-log", "maria-statement"]) await post(`/evidence/${id}/review`);
  await post("/actions/find-note"); await post("/evidence/ingrid-note/review");
  const before = await (await page.request.get(session)).json();
  before.board.notes = [{ id:"kept", text:"Behold dette arbeidsnotatet" }];
  before.board.positions = [{ id:"note:kept", x:40, y:40 }, { id:"person:jonas", x:760, y:960 }];
  before.board.connections = [{ id:"old", fromId:"note:kept", toId:"person:jonas", label:"Tidligere hypotese" }];
  expect((await page.request.put(session + "/board", { headers, data:before })).ok()).toBe(true);
  await page.goto("/cases/1999-1218/evidence/ingrid-note?compare=1");
  await page.getByRole("button", { name:"Personer", exact:true }).click();
  await page.getByRole("button", { name:"Velg Maria Nygård som sammenligningskilde", exact:true }).click();
  await page.getByLabel("Beskriv forbindelsen", { exact:false }).fill("Maria må forklare notatet.");
  await page.getByRole("button", { name:"Lagre koblingen på tavlen" }).click();
  await expect(page.getByRole("region", { name:"Din hypotese" })).toContainText("Koblingen er lagret som din hypotese");
  await page.screenshot({ path:testInfo.outputPath("maria-note-connection.png") });
  const saved = await (await page.request.get(session)).json();
  expect(saved.board.notes).toEqual(before.board.notes);
  expect(saved.board.positions.slice(0,2)).toEqual(before.board.positions);
  expect(saved.board.connections[0]).toEqual(before.board.connections[0]);
  expect(saved.board.connections).toHaveLength(2);
  await page.getByRole("link", { name:/Spør om notatet og den avtalte bagen/ }).click();
  await expect(page.getByRole("button", { name:"Spør om notatet og den avtalte bagen", exact:true })).toBeVisible();
  await page.goto("/cases/1999-1218/evidence/ingrid-note?compare=1&with=person%3Amaria");
  await expect(page.getByRole("region", { name:"Din hypotese" })).toContainText("Maria må forklare notatet.");
  await expect(page.getByRole("button", { name:"Lagre koblingen på tavlen" })).toBeDisabled();
  const other = await browser.newContext({ baseURL }); const otherPage = await other.newPage();
  // The unavailable-document view can render before the layout has opened its guest session.
  const sessionReady = otherPage.waitForResponse(response => response.url().endsWith(session + "/progress") && response.status() === 200);
  await otherPage.goto("/cases/1999-1218/evidence/ingrid-note?compare=1&with=person%3Amaria");
  await expect(otherPage.getByRole("heading", { name:"Dokumentet er ikke tilgjengelig i denne saken." })).toBeVisible();
  await sessionReady;
  const privateResponse = await other.request.get(session); expect(privateResponse.status()).toBe(200);
  const privateBoard = await privateResponse.json();
  expect(privateBoard.board.notes).toEqual([]); expect(privateBoard.board.connections).toEqual([]); await other.close();
});

test("a stale comparison preserves its text and merges only after loading the latest board", async ({ page }) => {
  const session = "/api/cases/1999-1218/investigation"; const headers = { "X-ColdCase-Request":"1" };
  await page.request.post(session, { headers });
  const before = await (await page.request.get(session)).json();
  before.board.notes = [{ id:"n", text:"Første notat" }];
  expect((await page.request.put(session + "/board", { headers, data:before })).ok()).toBe(true);
  const loaded = page.waitForResponse(response => response.url().endsWith(session) && response.request().method() === "GET");
  await page.goto("/cases/1999-1218/evidence/bus-ticket?compare=1&with=evidence%3Aphone-log"); await loaded;
  await page.getByLabel("Beskriv forbindelsen", { exact:false }).fill("Tidspunktene må sammenholdes.");
  const changed = await (await page.request.get(session)).json(); changed.board.notes[0].text = "Endret i en annen fane";
  expect((await page.request.put(session + "/board", { headers, data:changed })).ok()).toBe(true);
  await page.getByRole("button", { name:"Lagre koblingen på tavlen" }).click();
  await expect(page.getByRole("alert")).toContainText("annen fane");
  await expect(page.getByLabel("Beskriv forbindelsen", { exact:false })).toHaveValue("Tidspunktene må sammenholdes.");
  await page.getByRole("button", { name:"Hent nyeste tavle" }).click();
  await expect(page.getByRole("button", { name:"Lagre koblingen på tavlen" })).toBeEnabled();
  await page.getByRole("button", { name:"Lagre koblingen på tavlen" }).click();
  await expect(page.getByRole("region", { name:"Din hypotese" })).toContainText("Koblingen er lagret");
  const saved = await (await page.request.get(session)).json();
  expect(saved.board.notes[0].text).toBe("Endret i en annen fane"); expect(saved.board.connections).toHaveLength(1);
});

test("unsaved comparison navigation is guarded and unavailable sources reveal no hidden person", async ({ page }) => {
  const session = "/api/cases/1999-1218/investigation";
  await page.goto("/cases/1999-1218/evidence/bus-ticket?compare=1&with=person%3Alars");
  await expect(page.getByRole("region", { name:"Velg andre kilde" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Lars Viken");
  await expect(page.getByRole("button", { name:"Lagre koblingen på tavlen" })).toBeDisabled();
  await page.getByRole("button", { name:"Velg Samtalen kl. 21.47 som sammenligningskilde", exact:true }).click();
  await page.getByLabel("Beskriv forbindelsen", { exact:false }).fill("Ikke lagret ennå");
  await page.getByRole("button", { name:"Bytt den andre kilden" }).click();
  const guard = page.getByRole("dialog", { name:"Ulagret sammenligning" }); await expect(guard).toBeVisible();
  await guard.getByRole("button", { name:"Fortsett å redigere" }).click();
  await expect(page.getByLabel("Beskriv forbindelsen", { exact:false })).toHaveValue("Ikke lagret ennå");
  await page.getByRole("link", { name:"↖ Til skrivebordet", exact:true }).click(); await expect(guard).toBeVisible();
  await guard.getByRole("button", { name:"Forlat uten å lagre" }).click();
  await expect(page.getByRole("region", { name:"Etterforskningsbord" })).toBeVisible();
  const saved = await (await page.request.get(session)).json(); expect(saved.board.connections).toEqual([]);
});
