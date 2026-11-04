import { expect, test } from "@playwright/test";

test("timeline compares the witness observation with the scheduled bus and opens its source", async ({ page }) => {
  await page.goto("/cases/1999-1218/timeline");
  await page.getByRole("button", { name: "Sammenlign Sett ved butikken", exact: true }).click();
  await page.getByRole("button", { name: "Sammenlign Planlagt bussavgang", exact: true }).click();
  await expect(page.getByRole("heading", { name: "34 minutter mellom oppføringene" })).toBeVisible();
  await expect(page.locator(".timeline-list")).toContainText("ikke en bekreftet reise");
  await page.getByRole("link", { name: /Åpne kilde for Planlagt bussavgang/ }).click();
  await expect(page.locator(".evidence-document").first()).toContainText("Billetten ble ikke brukt.");
});
