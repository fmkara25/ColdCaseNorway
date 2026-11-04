import { expect, test } from "@playwright/test";

test("archive opens a case and its person register survives a refresh", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Åpne sak" }).click();
  await expect(page.getByRole("heading", { name: "Forsvinningen i Skardal" })).toBeVisible();
  await page.getByRole("link", { name: "PERSONER", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Personer", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ingrid Solberg/ })).toBeVisible();
  await page.getByRole("link", { name: /Maria Nygård/ }).click();
  await expect(page.getByRole("heading", { name: "Maria Nygård" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Maria Nygård" })).toBeVisible();
  await expect(page.getByText("Lars Viken")).toHaveCount(0);
});

test("mobile navigation and missing-case feedback remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cases/1999-1218/people/ingrid");
  await expect(page.getByRole("heading", { name: "Ingrid Solberg" })).toBeVisible();
  await expect(page.getByRole("link", { name: "PERSONER", exact: true })).toBeVisible();
  await page.goto("/cases/missing/people");
  await expect(page.getByRole("heading", { name: "Saken finnes ikke." })).toBeVisible();
  await page.getByRole("link", { name: "Til saksarkivet" }).click();
  await expect(page.getByRole("link", { name: "Åpne sak" })).toBeVisible();
});
