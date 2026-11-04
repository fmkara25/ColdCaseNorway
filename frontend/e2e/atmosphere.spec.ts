import { expect, test } from "@playwright/test";

test("archive illustrations load, stay consistent and fail gracefully", async ({ page }) => {
  await page.goto("/");
  const cover = page.getByRole("img", { name: "Illustrasjon: Skardal, Trøndelag" });
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Åpne sak" }).click();
  const portrait = page.getByRole("img", { name: "Illustrasjon: Ingrid Solberg" });
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText("Illustrasjon – ikke et bevis")).toBeVisible();
  const path = await portrait.getAttribute("src");
  await page.getByText("Mappen", { exact:true }).click();
  await page.getByRole("link", { name: "PERSONER", exact: true }).click();
  await page.getByRole("link", { name: /Ingrid Solberg/ }).click();
  await expect(page.getByRole("img", { name: "Illustrasjon: Ingrid Solberg" })).toHaveAttribute("src", path!);
  await page.route("**/images/ingrid-1999.webp", route => route.abort());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ingrid Solberg" })).toBeVisible();
  await expect(page.getByLabel("Ingen illustrasjon av Ingrid Solberg")).toBeVisible();
  await page.setViewportSize({ width:390, height:844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("sound requires explicit consent, mutes when hidden and starts off after reload", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    const contexts: AudioContext[] = [];
    Object.assign(window, { archiveAudioContexts: contexts });
    window.AudioContext = new Proxy(NativeAudio, { construct(target, args) {
      const context = Reflect.construct(target, args) as AudioContext; contexts.push(context); return context;
    } });
  });
  const states = () => page.evaluate(() => (window as unknown as { archiveAudioContexts: AudioContext[] }).archiveAudioContexts.map(context => context.state));
  await page.goto("/cases/1999-1218/evidence");
  await page.getByRole("link", { name: /Bussbillett til Trondheim/ }).click();
  expect(await states()).toEqual([]);
  await page.getByText("Lyd: av", { exact: true }).click();
  await page.getByRole("button", { name: "Slå på lyd" }).click();
  await expect(page.getByRole("button", { name: "Slå av lyd" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(states).toEqual(["running"]);
  await page.getByRole("checkbox", { name: "Papirlyder" }).uncheck();
  await page.getByRole("button", { name: "Slå av lyd" }).click();
  await expect.poll(states).toEqual(["suspended"]);
  await page.getByRole("button", { name: "Slå på lyd" }).click();
  // Deterministic visibility event; Chromium headless does not reliably hide background tabs.
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable:true, value:true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByText("Lyd: av", { exact:true })).toBeVisible();
  await expect.poll(states).toEqual(["suspended"]);
  await page.reload();
  await expect(page.getByText("Lyd: av", { exact:true })).toBeVisible(); expect(await states()).toEqual([]);
  await page.getByText("Lyd: av", { exact:true }).click();
  await page.getByRole("button", { name:"Slå på lyd" }).click();
  await expect.poll(states).toEqual(["running"]);
  await page.getByRole("link", { name:"← Saksarkiv" }).click();
  await expect.poll(states).toEqual(["closed"]);
});

test("unavailable audio does not block the investigation", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "AudioContext", { value:undefined }); });
  await page.goto("/cases/1999-1218");
  await page.getByText("Lyd: av", { exact:true }).click();
  await page.getByRole("button", { name:"Slå på lyd" }).click();
  await expect(page.locator(".sound-controls").getByRole("status")).toContainText("Du kan spille videre uten lyd.");
  await page.getByText("Mappen", { exact:true }).click();
  await page.getByRole("link", { name:"BEVIS", exact:true }).click();
  await expect(page.getByRole("heading", { name:"Bevis", exact:true })).toBeVisible();
});
