import { expect, test } from "@playwright/test";

test("map estimates an investigator-selected route, stops and an uncertain time window", async ({ page }) => {
  await page.goto("/cases/1999-1218/map");
  await page.getByRole("button", { name: "Skardal Hotel", exact: true }).click();
  await page.getByRole("button", { name: "Butikken", exact: true }).click();
  const result = page.locator(".route-result");
  await expect(result).toContainText("0,8 km");
  await expect(result).toContainText("10–14 minutter");
  await page.getByLabel("Tilgjengelig tidsrom, minutter").fill("13");
  await expect(result).toContainText("Bare deler av tidsanslaget");
  await page.getByLabel("Tid til stopp, minutter").fill("4");
  await expect(result).toContainText("14–18 minutter");
  await expect(result).toContainText("overstiger");
  await page.getByLabel("Bil i vinterføre").check();
  await expect(result).toContainText("6–8 minutter");
  await expect(result).toContainText("bekrefter ikke");
  await page.getByRole("button", { name: "Zoom inn", exact: true }).click();
  await expect(page.locator(".map-toolbar")).toContainText("125 %");
  await page.getByRole("button", { name: "Tilpass kart" }).click();
  await expect(page.locator(".map-toolbar")).toContainText("100 %");
  await page.getByRole("button", { name: "Tøm ruten" }).click();
  await expect(result).not.toContainText("0,8 km");
});

test("opening map response and guessed route do not reveal later locations", async ({ request }) => {
  const response = await request.get("/api/cases/1999-1218/map");
  expect(response.ok()).toBeTruthy();
  const graph = await response.json();
  expect(graph.locations.map((point: { id: string }) => point.id).sort()).toEqual(["bus-stop", "hotel", "market"]);
  const hidden = await request.post("/api/cases/1999-1218/map/estimate", { data: { locationIds: ["market", "mill-road"] } });
  expect(hidden.status()).toBe(400);
  expect(await hidden.text()).not.toContain("mill-road");
});
