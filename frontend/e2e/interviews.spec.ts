import { expect, test } from "@playwright/test";

test("people and interview stages stay within the game viewport", async ({ page }, testInfo) => {
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size);
    await page.goto("/cases/1999-1218/people");
    await expect(page.getByRole("link", { name:/Maria Nygård/ })).toBeVisible();
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    await expect.poll(() => page.locator(".portrait-file img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("people-1366.png") });
    await page.getByRole("link", { name:/Maria Nygård/ }).click();
    await expect(page.getByRole("heading", { name:"Maria Nygård", exact:true }).first()).toBeVisible();
    const choices = await page.getByRole("region", { name:"Samtalevalg" }).boundingBox();
    expect(choices!.y + choices!.height).toBeLessThanOrEqual(size.height - 40);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(false);
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("maria-1366.png") });
  }
});

for (const choice of ["open", "document"] as const) {
  test(`Maria ${choice} approach is durable, has its own followup and cannot be overwritten`, async ({ page, browser, baseURL }, testInfo) => {
    const session = "/api/cases/1999-1218/investigation";
    const headers = { "X-ColdCase-Request":"1" };
    async function post(path: string, data: unknown = {}) {
      const response = await page.request.post(session + path, { headers, data }); expect(response.ok(), await response.text()).toBe(true); return response.json();
    }
    await post("");
    for (const id of ["hotel-log", "maria-statement"]) await post(`/evidence/${id}/review`);
    await post("/actions/find-note"); await post("/evidence/ingrid-note/review");
    const board = await (await page.request.get(session)).json();
    board.board.positions = [{ id:"person:maria", x:0, y:0 }, { id:"evidence:ingrid-note", x:100, y:0 }];
    board.board.connections = [{ id:"maria-link", fromId:"person:maria", toId:"evidence:ingrid-note", label:"Undersøk notatet" }];
    expect((await page.request.put(session + "/board", { headers, data:board })).ok()).toBe(true);
    await page.goto("/cases/1999-1218/people/maria");
    const question = page.getByRole("button", { name:"Spør om notatet og den avtalte bagen", exact:true });
    await question.click();
    const approach = choice === "open" ? "Gi Maria rom til å forklare" : "Legg frem notatet først";
    await expect(page.getByRole("button", { name:approach, exact:true })).toBeVisible();
    const untouched = await (await page.request.get(session + "/progress")).json();
    expect(untouched.history.some((entry:{ id:string }) => entry.id === "maria-plan")).toBe(false);
    await page.screenshot({ path:testInfo.outputPath(`maria-${choice}-choices.png`) });
    if (choice === "document") {
      // Another client operation changes the shared investigation version while choices are open.
      await post("/evidence/bus-ticket/review");
      await page.getByRole("button", { name:approach, exact:true }).click();
      await expect(page.getByRole("alert")).toContainText("Oppdater");
      const uncommitted = await (await page.request.get(session + "/progress")).json();
      expect(uncommitted.history.some((entry:{ id:string }) => entry.id === "maria-plan")).toBe(false);
      await page.getByRole("button", { name:"Oppdater samtalen" }).click(); await question.click();
    }
    await page.getByRole("button", { name:approach, exact:true }).click();
    await expect(page.locator(".approach-receipt")).toContainText(approach);
    await expect(page.locator(".action-history")).toContainText("Bagen ble stående igjen");
    await expect(page.getByRole("link", { name:/Nytt dokument: Bagen hos Maria/ })).toBeVisible();
    await page.reload(); await expect(page.locator(".approach-receipt")).toContainText(approach);
    const saved = await (await page.request.get(session + "/progress")).json();
    expect(saved.history.find((entry:{ id:string }) => entry.id === "maria-plan").approach.id).toBe(choice);
    const rewrite = await page.request.post(session + "/actions/maria-plan", { headers, data:{ approachId:choice === "open" ? "document" : "open" } });
    expect(rewrite.status()).toBe(409);
    await post("/evidence/travel-bag/review"); await page.reload();
    const followup = choice === "open" ? "Be Maria utdype hvorfor hun holdt opplysningene tilbake" : "Be Maria skille mellom det hun vet og det hun antar";
    const alternate = choice === "open" ? "Be Maria skille mellom det hun vet og det hun antar" : "Be Maria utdype hvorfor hun holdt opplysningene tilbake";
    await expect(page.getByRole("button", { name:alternate, exact:true })).toHaveCount(0);
    await page.getByRole("button", { name:followup, exact:true }).click();
    await expect(page.locator(".action-history")).toContainText(choice === "open" ? "Jeg trodde jeg beskyttet henne" : "Det kan jeg bekrefte");
    await page.getByRole("button", { name:"Tidligere samtaler" }).click();
    await expect(page.getByRole("dialog", { name:"Tidligere samtaler" })).toContainText(approach);
    await page.keyboard.press("Escape");
    const other = await browser.newContext({ baseURL });
    expect((await other.request.get(session + "/progress")).status()).toBe(401); await other.close();
    const materials = await (await page.request.get("/api/cases/1999-1218/evidence")).json();
    expect(materials.some((entry:{ id:string }) => entry.id === "lars-account")).toBe(false);
  });
}
