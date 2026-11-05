import { expect, test } from "@playwright/test";

test("research explicitly reuses a map draft and preserves it after a rejected route", async ({ page }, testInfo) => {
  const root = "/cases/1999-1218";
  const session = "/api" + root + "/investigation";
  const headers = { "X-ColdCase-Request":"1" };
  async function post(path:string, data:unknown = {}) {
    const response = await page.request.post(session + path, {headers,data});
    expect(response.ok(), await response.text()).toBe(true); return response.json();
  }
  async function connect(fromId:string, toId:string) {
    const board = await (await page.request.get(session)).json();
    for (const id of [fromId,toId]) if (!board.board.positions.some((p:{id:string}) => p.id === id)) board.board.positions.push({id,x:40,y:40});
    board.board.connections.push({id:crypto.randomUUID(),fromId,toId,label:"Undersøk kildene"});
    expect((await page.request.put(session + "/board", {headers,data:board})).ok()).toBe(true);
  }
  await post("");
  for (const id of ["hotel-log","maria-statement","bus-ticket","market-witness"]) await post(`/evidence/${id}/review`);
  await post("/actions/find-note"); await post("/evidence/ingrid-note/review");
  await connect("person:maria","evidence:ingrid-note");
  const progress = await (await page.request.get(session + "/progress")).json();
  await post("/actions/maria-plan", {approachId:"open",expectedVersion:progress.version});
  await post("/evidence/travel-bag/review"); await connect("evidence:travel-bag","evidence:bus-ticket");
  await post("/actions/witness-followup");
  for (const id of ["vehicle-witness","erik-phone"]) await post(`/evidence/${id}/review`);
  const before = await (await page.request.get(session + "/progress")).json();
  const submitted:string[][] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/actions/erik-route")) submitted.push(request.postDataJSON().locationIds); });
  async function chooseRoute(stops:string[]) {
    await page.goto(root + "/map");
    const clear = page.getByRole("button", {name:"Tøm ruten",exact:true}); if (await clear.isEnabled()) await clear.click();
    for (const stop of stops) await page.getByRole("button", {name:`Legg til ${stop} i ruten`,exact:true}).click();
    await expect(page.locator(".route-result")).toContainText("km");
    await page.goto(root);
    await page.getByRole("button", {name:/Følg opp undersøkelsene/}).click();
  }
  await chooseRoute(["Skardal Hotel","Butikken","Skardal Hotel"]);
  const panel = page.getByRole("region", {name:"Videre undersøkelser",exact:true});
  const action = panel.getByRole("button", {name:"Vurder Eriks tids- og stedsopplysninger",exact:true});
  await expect(action).toBeDisabled();
  await panel.getByRole("button", {name:"Bruk ruteutkastet fra kartet",exact:true}).click();
  await expect(panel.getByRole("region", {name:"Rute valgt til vurderingen",exact:true})).toContainText("Skardal Hotel");
  expect(submitted).toEqual([]);
  await action.click(); await expect(panel.getByRole("alert")).toContainText("ikke tilgjengelig");
  await expect(panel.getByRole("region", {name:"Rute valgt til vurderingen",exact:true})).toContainText("Butikken");
  expect(await (await page.request.get(session + "/progress")).json()).toEqual(before);
  await chooseRoute(["Butikken","Telefonstedet"]);
  await panel.getByRole("button", {name:"Bruk ruteutkastet fra kartet",exact:true}).click();
  for (const size of [{width:1366,height:768},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await expect(action).toBeVisible();
    expect(await page.evaluate(() => ({x:document.documentElement.scrollWidth > innerWidth,y:document.documentElement.scrollHeight > innerHeight}))).toEqual({x:false,y:false});
    await page.screenshot({path:testInfo.outputPath(`desk-route-draft-${size.width}.png`)});
  }
  expect(submitted).toEqual([["hotel","market","hotel"]]);
  await action.click(); await expect(panel.locator(".action-history")).toContainText("22–30 minutter");
  expect(submitted).toEqual([["hotel","market","hotel"],["market","payphone"]]);
  await page.goto(root + "/map");
  await expect(page.getByRole("list", {name:"Valgt ruterekkefølge",exact:true})).toContainText("Telefonstedet");
});
