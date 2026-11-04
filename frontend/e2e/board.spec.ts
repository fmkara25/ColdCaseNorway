import { expect, test } from "@playwright/test";

test("board saves moved cards, notes and links to PostgreSQL and isolates another browser", async ({ page, browser }) => {
  await page.goto("/cases/1999-1218/board");
  await page.getByLabel("Kilde", { exact: true }).selectOption("person:ingrid");
  await page.getByRole("button", { name: "Fest til tavlen" }).click();
  await page.getByLabel("Kilde", { exact: true }).selectOption("evidence:bus-ticket");
  await page.getByRole("button", { name: "Fest til tavlen" }).click();
  await page.getByLabel("Notattekst", { exact: true }).fill("Billetten viser en plan, ikke en reise.");
  await page.getByRole("button", { name: "Legg til notat", exact: true }).click();
  await page.getByLabel("Fra", { exact: true }).selectOption("person:ingrid");
  await page.getByLabel("Til", { exact: true }).selectOption("evidence:bus-ticket");
  await page.getByLabel("Beskrivelse", { exact: true }).fill("Planlagt reise");
  await page.getByRole("button", { name: "Opprett forbindelse" }).click();
  const drag = page.getByRole("button", { name: "Flytt Ingrid Solberg", exact: true });
  const box = await drag.boundingBox();
  if (!box) throw new Error("Card is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  const card = page.locator(".board-card").filter({ has: page.getByRole("heading", { name: "Ingrid Solberg", exact: true }) });
  await expect(card).toHaveCSS("left", "100px");
  await page.getByRole("button", { name: "Lagre tavlen", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Lagret$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Rediger notat Billetten viser/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Forbindelser", exact: true })).toContainText("Planlagt reise");
  await expect(page.locator(".board-card").filter({ has: page.getByRole("heading", { name: "Ingrid Solberg", exact: true }) })).toHaveCSS("left", "100px");
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/cases/1999-1218/board");
  await expect(otherPage.getByText("Fest en kilde eller legg til et notat for å begynne.")).toBeVisible();
  await expect(otherPage.locator(".board-notes textarea")).toHaveCount(0);
  await other.close();
});

test("leaving an unsaved board requires an explicit choice", async ({ page }) => {
  await page.goto("/cases/1999-1218/board");
  await page.getByLabel("Notattekst", { exact: true }).fill("Ulagret hypotese");
  await page.getByRole("button", { name: "Legg til notat", exact: true }).click();
  await page.getByRole("link", { name: "OVERSIKT", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ulagrede endringer" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fortsett å redigere" }).click();
  await expect(page.getByLabel("Rediger notat Ulagret hypotese")).toHaveValue("Ulagret hypotese");
});

test("notes can be edited separately without requiring a pinned card", async ({ page }) => {
  await page.goto("/cases/1999-1218/notes");
  await expect(page.getByRole("heading", { name: "Notater", exact: true })).toBeVisible();
  await page.getByLabel("Notattekst", { exact: true }).fill("Sammenlign tidsopplysningene.");
  await page.getByRole("button", { name: "Legg til notat", exact: true }).click();
  await page.getByRole("button", { name: "Lagre tavlen", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Lagret$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Rediger notat Sammenlign/)).toHaveValue("Sammenlign tidsopplysningene.");
});
