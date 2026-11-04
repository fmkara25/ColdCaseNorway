import { expect, test, type Page } from "@playwright/test";

// Synthetic public view only: layout/draft/error tests do not assert the Case 01 solution.
// The real gated case-to-epilogue flow remains in investigation.spec.ts.
const view = { isClosed:false, questions:[
  { id:"a", label:"Hvilken forklaring vil du undersøke?", options:[{ id:"one", label:"Første arbeidshypotese" }, { id:"two", label:"Andre arbeidshypotese" }] },
  { id:"b", label:"Hvordan vurderer du rekkefølgen?", options:[{ id:"first", label:"Første mulige rekkefølge" }, { id:"second", label:"Andre mulige rekkefølge" }] },
], minEvidence:2, maxEvidence:3, stopAllowanceMinutes:8,
  sources:Array.from({ length:5 }, (_,i) => ({ id:`source-${i}`, title:`Arkivkilde ${i + 1}`, reviewed:i !== 2 })),
  locations:[{ id:"hotel", name:"Hotell" }, { id:"market", name:"Butikk" }] };
async function setup(page:Page) {
  await page.addInitScript(() => { if (!localStorage.getItem("cold-case-theory-drafts")) localStorage.setItem("cold-case-theory-drafts", JSON.stringify({ version:1, state:{ routes:{ "1999-1218":["hotel", "market"] }, theories:{} } })); });
  await page.route("**/investigation/reconstruction", route => route.fulfill({ json:view }));
}
async function fill(page:Page) {
  await page.getByRole("radio", { name:"Første arbeidshypotese", exact:true }).check();
  await page.getByRole("button", { name:"Neste vurdering", exact:true }).click();
  await page.getByRole("radio", { name:"Andre mulige rekkefølge", exact:true }).check();
  await page.getByRole("button", { name:"Velg støttende kilder ↗", exact:true }).click();
  await expect(page.getByRole("checkbox", { name:"Velg Arkivkilde 3", exact:true })).toBeDisabled();
  await page.getByRole("checkbox", { name:"Velg Arkivkilde 1", exact:true }).check();
  await page.getByRole("button", { name:"Neste støttekilder", exact:true }).click();
  await page.getByRole("checkbox", { name:"Velg Arkivkilde 5", exact:true }).check();
}

test("reconstruction uses fixed focused stages on desktop and mobile", async ({ page }, testInfo) => {
  await setup(page);
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218/reconstruction");
    await expect(page.getByRole("heading", { name:view.questions[0].label, exact:true })).toBeFocused();
    await page.screenshot({ path:testInfo.outputPath(`reconstruction-choice-${size.width}.png`) });
    await fill(page);
    await page.screenshot({ path:testInfo.outputPath(`reconstruction-sources-${size.width}.png`) });
    await page.getByRole("button", { name:"Kontroller ruten ↗", exact:true }).click();
    await expect(page.getByRole("region", { name:"Stedene i ruteutkastet", exact:true })).toContainText("Hotell");
    await page.getByRole("button", { name:"Se samlet vurdering ↗", exact:true }).click();
    await expect(page.getByRole("button", { name:"Lever rekonstruksjonen", exact:true })).toBeEnabled();
    expect(await page.evaluate(() => ({ x:document.documentElement.scrollWidth > innerWidth, y:document.documentElement.scrollHeight > innerHeight }))).toEqual({ x:false, y:false });
    const content = await page.locator(".reconstruction-content").boundingBox(); expect(content!.y + content!.height).toBeLessThanOrEqual(size.height - 40);
    await page.screenshot({ path:testInfo.outputPath(`reconstruction-review-${size.width}.png`) });
    await page.getByRole("button", { name:"1 Hendelsesforløp", exact:true }).click();
    await expect(page.getByRole("radio", { name:"Andre mulige rekkefølge", exact:true })).toBeChecked();
  }
});

test("theory draft survives reload and rejected or interrupted submissions remain editable", async ({ page }) => {
  await setup(page); await page.goto("/cases/1999-1218/reconstruction"); await fill(page);
  await page.reload();
  await expect(page.getByRole("radio", { name:"Første arbeidshypotese", exact:true })).toBeChecked();
  await page.getByRole("button", { name:"2 Kilder", exact:true }).click();
  await page.getByRole("button", { name:"Neste støttekilder", exact:true }).click();
  await expect(page.getByRole("checkbox", { name:"Velg Arkivkilde 5", exact:true })).toBeChecked();
  await page.getByRole("button", { name:"4 Samlet vurdering", exact:true }).click();
  await page.route("**/investigation/reconstruction", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json:view });
    return route.fulfill({ json:{ accepted:false, message:"Se nærmere på kildenes sammenheng." } });
  });
  await page.getByRole("button", { name:"Lever rekonstruksjonen", exact:true }).click();
  await expect(page.getByRole("status")).toContainText("Se nærmere");
  await page.getByRole("button", { name:"2 Kilder", exact:true }).click();
  await expect(page.getByRole("checkbox", { name:"Velg Arkivkilde 5", exact:true })).toBeChecked();
  await page.getByRole("button", { name:"4 Samlet vurdering", exact:true }).click();
  await page.route("**/investigation/reconstruction", route => route.fulfill({ status:503, body:"{}" }));
  await page.getByRole("button", { name:"Lever rekonstruksjonen", exact:true }).click();
  await expect(page.getByRole("alert")).toContainText("Utkastet er beholdt");
  await expect(page.getByRole("button", { name:"Lever rekonstruksjonen", exact:true })).toBeEnabled();
});

test("locked reconstruction exposes no question choices or ending", async ({ page }) => {
  await page.goto("/cases/1999-1218/reconstruction");
  await expect(page.getByRole("heading", { name:"Rekonstruksjonen er ikke klar ennå.", exact:true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("button", { name:"Lever rekonstruksjonen", exact:true })).toHaveCount(0);
});
