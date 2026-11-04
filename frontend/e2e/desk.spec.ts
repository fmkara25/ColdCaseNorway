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
    for (let i=0; i<4; i++) await dialog.getByRole("button", { name:"Større dokumenttekst" }).click();
    await expect(dialog.getByRole("button", { name:"Større dokumenttekst" })).toBeDisabled();
    const source = dialog.getByRole("region", { name:"Dokumentinnhold" });
    await source.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await source.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(false);
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("inspection-1366.png") });
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
