import { expect, test } from "@playwright/test";

const root = "/cases/1999-1218";
const api = "/api/cases/1999-1218";

test("timeline carries source-backed assumptions to map without choosing a route or changing investigation progress", async ({ page }, testInfo) => {
  expect((await page.request.post(api + "/investigation", { headers:{"X-ColdCase-Request":"1"} })).ok()).toBe(true);
  const before = await (await page.request.get(api + "/investigation/progress")).json();
  for (const size of [{width:1366,height:768},{width:390,height:844}]) {
    await page.setViewportSize(size); await page.goto(root + "/timeline");
    await page.getByRole("button", { name:"Sammenlign Sett ved butikken", exact:true }).click();
    await page.getByRole("button", { name:"Sammenlign Planlagt bussavgang", exact:true }).click();
    expect(await page.evaluate(() => ({x:document.documentElement.scrollWidth > innerWidth,y:document.documentElement.scrollHeight > innerHeight}))).toEqual({x:false,y:false});
    await page.screenshot({path:testInfo.outputPath(`timeline-map-link-${size.width}.png`)});
    await page.getByRole("link", { name:"Prøv tidsrommet på kartet ↗", exact:true }).click();
    const source = page.getByRole("region", { name:"Tidsrom fra tidslinjen", exact:true });
    await expect(source).toContainText("34 minutter mellom tidskortene");
    await expect(source).toContainText("ca. 22.11");
    await expect(source).toContainText("22.45 · Planlagt bussavgang (planlagt)");
    await expect(source).toContainText("Minst ett tidspunkt er omtrentlig");
    await expect(page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true})).toHaveValue("34");
    // A time assumption does not invent stops; a previous investigator-selected route survives.
    if (size.width === 1366) await expect(page.locator(".route-result")).toContainText("Velg minst to steder");
    else await expect(page.locator(".route-result")).toContainText("0,8 km");
    await page.getByRole("button", { name:"1 · Velg steder", exact:true }).click();
    const clear = page.getByRole("button", { name:"Tøm ruten", exact:true }); if (await clear.isEnabled()) await clear.click();
    await page.getByRole("button", { name:"Skardal Hotel", exact:true }).click();
    await page.getByRole("button", { name:"Butikken", exact:true }).click();
    await page.getByRole("button", { name:"2 · Prøv tidsrommet", exact:true }).click();
    await expect(page.locator(".route-result")).toContainText("passer innenfor tidsrommet");
    await page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true}).fill("3");
    await expect(source).toContainText("Tidsrommet er endret manuelt");
    await expect(page.locator(".route-result")).toContainText("overstiger");
    await source.getByRole("button", { name:"Bruk tidskortene igjen", exact:true }).click();
    await expect(page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true})).toHaveValue("34");
    expect(await page.evaluate(() => ({x:document.documentElement.scrollWidth > innerWidth,y:document.documentElement.scrollHeight > innerHeight}))).toEqual({x:false,y:false});
    await page.screenshot({path:testInfo.outputPath(`map-time-handoff-${size.width}.png`)});
    await page.reload();
    await expect(page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true})).toHaveValue("34");
    await expect(page.locator(".route-result")).toContainText("0,8 km");
    await page.getByRole("link", { name:"Undersøk tidspunktene ↗", exact:true }).click();
    await expect(page.getByRole("heading", { name:"34 minutter mellom oppføringene", exact:true })).toBeVisible();
    await expect(page.getByRole("button", { name:"Sammenlign Sett ved butikken", exact:true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name:/Fjern Sett ved butikken/ }).click();
    await expect(page.getByRole("link", { name:"Prøv tidsrommet på kartet ↗", exact:true })).toHaveCount(0);
  }
  const after = await (await page.request.get(api + "/investigation/progress")).json();
  expect(after).toEqual(before);
});

test("unavailable time card IDs and injected minutes cannot reveal a hidden event or supply an interval", async ({ page }) => {
  const events = await (await page.request.get(api + "/timeline")).json();
  const known = events.find((item:{minuteOfDay:number|null}) => item.minuteOfDay !== null);
  await page.goto(root + `/map?timeCard=${encodeURIComponent(known.id)}&timeCard=station-payment&minutes=36&label=SECRET_LABEL`);
  const source = page.getByRole("region", { name:"Tidsrom fra tidslinjen", exact:true });
  await expect(source).toContainText("ikke tilgjengelige for beregning");
  await expect(source).not.toContainText("Betaling ved Skardal Nord");
  await expect(source).not.toContainText("SECRET_LABEL");
  await expect(page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true})).toHaveValue("");
});

test("failed timeline reads leave route tools usable and preserve a manual interval through retry", async ({ page }) => {
  const events = await (await page.request.get(api + "/timeline")).json();
  const ids = events.filter((item:{title:string}) => ["Sett ved butikken", "Planlagt bussavgang"].includes(item.title)).map((item:{id:string}) => item.id);
  const search = new URLSearchParams(); ids.forEach((id:string) => search.append("timeCard", id));
  await page.route("**/timeline", route => route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  await page.goto(root + `/map?${search}`);
  const source = page.getByRole("region", { name:"Tidsrom fra tidslinjen", exact:true });
  await expect(source).toContainText("Kunne ikke hente tidskortene");
  await page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true}).fill("3");
  await page.getByRole("button", { name:"Legg til Skardal Hotel i ruten", exact:true }).click();
  await page.getByRole("button", { name:"Legg til Butikken i ruten", exact:true }).click();
  await expect(page.locator(".route-result")).toContainText("overstiger");
  await page.unroute("**/timeline");
  await source.getByRole("button", { name:"Hent tidskortene igjen", exact:true }).click();
  await expect(source).toContainText("34 minutter mellom tidskortene");
  await expect(page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true})).toHaveValue("3");
  await source.getByRole("button", { name:"Bruk tidskortene igjen", exact:true }).click();
  await expect(page.getByLabel("Tilgjengelig tidsrom, minutter", {exact:true})).toHaveValue("34");
  await expect(page.locator(".route-result")).toContainText("0,8 km");
});
