import { expect, test } from "@playwright/test";

test("evidence document can be enlarged and reading progress survives refresh", async ({ page }) => {
  await page.goto("/cases/1999-1218/evidence");
  await page.getByRole("link", { name: /Bussbillett til Trondheim/ }).click();
  await expect(page.locator(".evidence-document").first()).toContainText("Billetten ble ikke brukt.");
  await page.getByRole("button", { name: "Forstørr dokument" }).click();
  const dialog = page.getByRole("dialog", { name: "Forstørret dokument" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Større tekst" }).click();
  await expect(dialog).toContainText("120 %");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Marker som gjennomgått" }).click();
  await expect(page.getByRole("button", { name: "Gjennomgått", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Gjennomgått", exact: true })).toBeDisabled();
  await page.goto("/cases/1999-1218/evidence/unknown");
  await expect(page.getByRole("heading", { name: "Dokumentet er ikke tilgjengelig i denne saken." })).toBeVisible();
});
