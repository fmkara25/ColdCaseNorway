import { expect, test } from "@playwright/test";

test("timeline compares the witness observation with the scheduled bus and opens its source", async ({ page }) => {
  await page.goto("/cases/1999-1218/timeline");
  await page.getByRole("button", { name: "Sammenlign Sett ved butikken", exact: true }).click();
  await page.getByRole("button", { name: "Sammenlign Planlagt bussavgang", exact: true }).click();
  await expect(page.getByRole("heading", { name: "34 minutter mellom oppføringene" })).toBeVisible();
  await expect(page.getByRole("region", { name:"Valgt tidsoppføring" })).toContainText("ikke en bekreftet reise");
  await page.getByRole("link", { name: /Åpne kilde for Planlagt bussavgang/ }).click();
  await expect(page.locator(".evidence-document").first()).toContainText("Billetten ble ikke brukt.");
});


test("timeline cards and comparison stay inside the viewport and preserve uncertainty", async ({ page }, testInfo) => {
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218/timeline");
    await page.getByRole("button", { name:"Undersøk Et uavklart tidsrom", exact:true }).click();
    await expect(page.getByRole("region", { name:"Valgt tidsoppføring" })).toContainText("Ukjent tid brukes ikke som nullpunkt");
    await expect(page.getByRole("region", { name:"Sammenligning av tid", exact:true })).not.toContainText("minutter mellom");
    await page.getByRole("button", { name:"Sammenlign Sett ved butikken", exact:true }).click();
    await page.getByRole("button", { name:"Sammenlign Planlagt bussavgang", exact:true }).click();
    const summary = page.getByRole("region", { name:"Sammenligning av tid", exact:true });
    await expect(summary).toContainText("Minst ett tidspunkt er omtrentlig");
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    const bounds = await summary.boundingBox(); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height - 40);
    await page.screenshot({ path:testInfo.outputPath(`timeline-${size.width}.png`) });
    await page.getByRole("link", { name:"Legg kildene ved siden av hverandre ↗", exact:true }).click();
    await expect(page.getByRole("region", { name:"Første kilde", exact:true })).toContainText("butikken");
    await expect(page.getByRole("region", { name:"Andre kilde", exact:true })).toContainText("Bussbillett til Trondheim");
  }
});

test("a third time replaces the oldest selection and removing a card clears the interval", async ({ page }) => {
  await page.goto("/cases/1999-1218/timeline");
  for (const name of ["Telefonsamtale", "Sett ved butikken", "Planlagt bussavgang"]) await page.getByRole("button", { name:`Sammenlign ${name}`, exact:true }).click();
  await expect(page.getByRole("button", { name:"Sammenlign Telefonsamtale", exact:true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { name:"34 minutter mellom oppføringene" })).toBeVisible();
  await page.getByRole("button", { name:"Fjern Sett ved butikken fra sammenligningen", exact:true }).click();
  await expect(page.getByRole("heading", { name:"Sammenlign to tidspunkter", exact:true })).toBeVisible();
  await expect(page.getByRole("link", { name:"Prøv tidsrommet på kartet ↗", exact:true })).toHaveCount(0);
  const timeline = await (await page.request.get("/api/cases/1999-1218/timeline")).json();
  expect(timeline.some((item:{ id:string }) => item.id === "station-payment")).toBe(false);
  await expect(page.locator("body")).not.toContainText("Betaling ved Skardal Nord");
});
