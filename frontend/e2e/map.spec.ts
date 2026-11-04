import { expect, test } from "@playwright/test";

test("map estimates an investigator-selected route, stops and an uncertain time window", async ({ page }) => {
  await page.goto("/cases/1999-1218/map");
  await page.getByRole("button", { name: "Skardal Hotel", exact: true }).click();
  await page.getByRole("button", { name: "Butikken", exact: true }).click();
  const result = page.locator(".route-result");
  await expect(result).toContainText("0,8 km");
  await expect(result).toContainText("10–14 minutter");
  await page.getByRole("button", { name:"2 · Prøv tidsrommet", exact:true }).click();
  await page.getByLabel("Tilgjengelig tidsrom, minutter").fill("13");
  await expect(result).toContainText("Bare deler av tidsanslaget");
  await page.getByLabel("Tid til stopp, minutter").fill("4");
  await expect(result).toContainText("14–18 minutter");
  await expect(result).toContainText("overstiger");
  await page.getByLabel("Bil i vinterføre").check();
  await expect(result).toContainText("6–8 minutter");
  await expect(result).toContainText("bekrefter ikke");
  await page.getByRole("button", { name: "Zoom inn", exact: true }).click();
  await expect(page.locator(".map-toolbar")).toContainText("125 %");
  await page.getByRole("button", { name: "Tilpass kart" }).click();
  await expect(page.locator(".map-toolbar")).toContainText("100 %");
  await page.getByRole("button", { name: "Tøm ruten" }).click();
  await expect(result).not.toContainText("0,8 km");
});

test("opening map response and guessed route do not reveal later locations", async ({ request }) => {
  const response = await request.get("/api/cases/1999-1218/map");
  expect(response.ok()).toBeTruthy();
  const graph = await response.json();
  expect(graph.locations.map((point: { id: string }) => point.id).sort()).toEqual(["bus-stop", "hotel", "market"]);
  const hidden = await request.post("/api/cases/1999-1218/map/estimate", { data: { locationIds: ["market", "mill-road"] } });
  expect(hidden.status()).toBe(400);
  expect(await hidden.text()).not.toContain("mill-road");
});


test("route workshop fits desktop and mobile and keeps the route draft across reload", async ({ page }, testInfo) => {
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218/map");
    const clear = page.getByRole("button", { name:"Tøm ruten", exact:true }); if (await clear.isEnabled()) await clear.click();
    await page.getByRole("button", { name:"Skardal Hotel", exact:true }).click();
    await expect(page.getByRole("button", { name:"Bussholdeplassen", exact:true })).toBeDisabled();
    await page.getByRole("button", { name:"Butikken", exact:true }).click();
    await expect(page.locator(".route-result")).toContainText("0,8 km");
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    const bounds = await page.getByRole("region", { name:"Ruteberegning", exact:true }).boundingBox(); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height - 40);
    await page.screenshot({ path:testInfo.outputPath(`map-route-${size.width}.png`) });
    await page.getByRole("button", { name:"2 · Prøv tidsrommet", exact:true }).click();
    await page.getByLabel("Bil i vinterføre", { exact:true }).check();
    await page.getByLabel("Tilgjengelig tidsrom, minutter", { exact:true }).fill("3");
    await expect(page.locator(".route-result")).toContainText("Bare deler");
    await page.screenshot({ path:testInfo.outputPath(`map-time-${size.width}.png`) });
    await page.reload();
    await expect(page.getByRole("list", { name:"Valgt ruterekkefølge", exact:true })).toContainText("Skardal Hotel");
    await expect(page.locator(".route-result")).toContainText("10–14 minutter");
    await page.getByRole("button", { name:"Angre siste sted", exact:true }).click();
    await expect(page.getByRole("list", { name:"Valgt ruterekkefølge", exact:true }).getByRole("listitem")).toHaveCount(1);
    await expect(page.locator("body")).not.toContainText("Det gamle serviceområdet");
  }
});

test("failed route estimates preserve the draft and recover without claiming a journey", async ({ page }) => {
  await page.route("**/map/estimate", route => route.fulfill({ status:503, body:"{}" }));
  await page.goto("/cases/1999-1218/map");
  await page.getByRole("button", { name:"Skardal Hotel", exact:true }).click();
  await page.getByRole("button", { name:"Butikken", exact:true }).click();
  const result = page.locator(".route-result"); await expect(result).toContainText("Utkastet ditt er beholdt");
  await expect(page.getByRole("list", { name:"Valgt ruterekkefølge", exact:true }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("link", { name:/Bruk ruten i rekonstruksjonen/ })).toHaveCount(0);
  await page.unroute("**/map/estimate"); await result.getByRole("button", { name:"Prøv igjen", exact:true }).click();
  await expect(result).toContainText("0,8 km");
  await expect(result).toContainText("hypotese");
});

test("map can be panned and connected stops selected with the keyboard", async ({ page }) => {
  await page.goto("/cases/1999-1218/map");
  const map = page.locator("svg.case-map"); await map.focus(); await page.keyboard.press("ArrowLeft");
  await expect(map.locator(":scope > g")).toHaveAttribute("transform", "translate(40 0) scale(1)");
  const hotel = page.getByRole("button", { name:"Legg til Skardal Hotel i ruten", exact:true });
  await hotel.focus(); await page.keyboard.press("Enter");
  const bus = page.getByRole("button", { name:"Legg til Bussholdeplassen i ruten", exact:true });
  await expect(bus).toHaveAttribute("aria-disabled", "true"); await bus.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name:"Valgt ruterekkefølge", exact:true }).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name:"Legg til Butikken i ruten", exact:true }).focus(); await page.keyboard.press("Space");
  await expect(page.locator(".route-result")).toContainText("0,8 km");
  await page.getByRole("button", { name:"Tilpass kart", exact:true }).click();
  await expect(map.locator(":scope > g")).toHaveAttribute("transform", "translate(0 0) scale(1)");
});
