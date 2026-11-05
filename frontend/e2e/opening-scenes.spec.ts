import { expect, test } from "@playwright/test";

for (const phoneFirst of [false, true]) {
  test(`opening follows the ${phoneFirst ? "phone" : "travel"} lead and unlocks the witness after a supported inference`, async ({ page }) => {
    const viewport = phoneFirst ? { width: 390, height: 844 } : { width: 1366, height: 768 };
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("link", { name: /Spill åpningen/ }).click();
    await expect(page.getByRole("heading", { name: "Velg ditt første spor" })).toBeVisible();
    if (phoneFirst) {
      await page.getByRole("button", { name: "Kontroller samtalen kl. 21.47" }).click();
      await expect(page.getByText(/viser loggen en samtale mellom Ingrid og Jonas/)).toBeVisible();
    }
    await page.getByRole("button", { name: "Følg reiseplanen med Maria" }).click();
    await expect(page.getByRole("heading", { name: "Samtalen med Maria" })).toBeVisible();
    await page.getByRole("button", { name: "Knytt samtaleloggen til Maria" }).click();
    await expect(page.getByText(/Se etter en kilde som omtaler en avtale/)).toBeVisible();
    await page.getByRole("button", { name: "Knytt Ingrids notat til Maria" }).click();
    await page.getByRole("button", { name: phoneFirst ? "Legg frem notatet først" : "Gi Maria rom til å forklare" }).click();
    await expect(page.getByRole("heading", { name: "En plan eller en reise?" })).toBeVisible();
    await expect(page.getByText(phoneFirst ? /må forklare det notatet/ : /får forklare det selv/)).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Velg som grunnlag: Bagen hos Maria", exact: true }).click();
    await page.getByRole("button", { name: "Velg som grunnlag: Bussbillett til Trondheim", exact: true }).click();
    await page.getByRole("button", { name: "Sammenhold kildene" }).click();
    await page.getByRole("button", { name: "Hun tok bussen til Trondheim." }).click();
    await expect(page.getByText(/hva som faktisk skjedde med bagen/)).toBeVisible();
    const progress = "/api/cases/1999-1218/investigation/progress";
    expect((await (await page.request.get(progress)).json()).history.some((item: { id: string }) => item.id === "witness-followup")).toBe(false);
    await page.getByRole("button", { name: "Hun planla å reise. Kildene viser ikke at hun dro." }).click();
    await expect(page.getByRole("heading", { name: "Nytt spor ved butikken" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Nytt spor ved butikken" })).toBeVisible();
    expect((await (await page.request.get(progress)).json()).history.some((item: { id: string }) => item.id === "witness-followup")).toBe(true);
    await page.getByRole("button", { name: "Legg til Butikken i ruten", exact: true }).click();
    await page.getByRole("button", { name: "Legg til Telefonstedet i ruten", exact: true }).click();
    await expect(page.getByText(/Anslått kjøretid i vinterføre: 22–30 minutter/)).toBeVisible();
    await page.getByRole("button", { name: "Ja, tidspunktene passer med ruten." }).click();
    await expect(page.getByText(/Sammenlign tidsrommet mellom kortene/)).toBeVisible();
    expect((await (await page.request.get(progress)).json()).history.some((item: { id: string }) => item.id === "erik-route")).toBe(false);
    await page.getByRole("button", { name: "Nei, tidsrommet virker for kort for denne ruten." }).click();
    await expect(page.getByRole("heading", { name: "Kjøretøysporet åpnes" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Kjøretøysporet åpnes" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
