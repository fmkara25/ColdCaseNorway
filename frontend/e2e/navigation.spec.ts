import { expect, test } from "@playwright/test";

test("keyboard users can skip navigation and focus follows completed page changes", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name:"Åpne sak" })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name:"Hopp til innhold" });
  await expect(skip).toBeFocused(); await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name:"Åpne sak" }).click();
  await expect(page.getByRole("heading", { name:"Forsvinningen i Skardal" })).toBeFocused();
  await page.goto("/cases/1999-1218");
  await page.getByText("Mappen", { exact:true }).click();
  const people = page.getByRole("link", { name:"PERSONER", exact:true });
  await people.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name:"Personer", exact:true })).toBeVisible();
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByText("Mappen", { exact:true }).click();
  await expect(people).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name:"NOTATER", exact:true }).click();
  const input = page.getByRole("textbox").first();
  await input.fill("Arbeidsnotat");
  await expect(input).toBeFocused();
  // A reload may restore native input focus; a fresh document must retain normal tab order.
  const fresh = await context.newPage();
  await fresh.goto("/cases/1999-1218/people");
  await expect(fresh.getByRole("heading", { name:"Personer", exact:true })).toBeVisible();
  await fresh.keyboard.press("Tab");
  await expect(fresh.getByRole("link", { name:"Hopp til innhold" })).toBeFocused();
  await fresh.close();
});

test("unexpected render failures show safe Bokmål recovery and reload restores the archive", async ({ page }) => {
  await page.addInitScript(() => {
    const Original = Intl.DateTimeFormat;
    Intl.DateTimeFormat = new Proxy(Original, { construct(target, args) {
      if (!sessionStorage.getItem("render-failure-tested")) throw new Error("INTERNAL_RENDER_SECRET");
      return Reflect.construct(target, args);
    } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name:"Noe gikk galt med visningen." })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("INTERNAL_RENDER_SECRET");
  await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
  await expect(page.getByText("Ulagrede endringer kan gå tapt.", { exact:false })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("render-failure-tested", "1"));
  await page.getByRole("button", { name:"Last inn på nytt" }).click();
  await expect(page.getByRole("link", { name:"Åpne sak" })).toBeVisible();
});
