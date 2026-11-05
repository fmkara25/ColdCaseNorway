import { expect, test } from "@playwright/test";

for (const correct of [true, false]) {
  test(`simple case saves progress and gives a ${correct ? "correct" : "wrong"} verdict`, async ({ page }) => {
    await page.setViewportSize(correct ? { width: 1366, height: 768 } : { width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("link", { name: "Åpne sak" }).click();
    await expect(page.getByRole("heading", { name: "Forsvinningen i Skardal" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Saksverktøy" })).toHaveCount(0);
    await page.getByRole("button", { name: "Start etterforskningen" }).click();
    await page.getByRole("button", { name: correct ? "Hun planla å reise" : "Hun kom fram til Trondheim" }).click();
    await page.reload();
    await expect(page.getByRole("status")).toContainText(correct ? "Billetten viser en plan" : "Billetten ble ikke brukt");
    const next = page.getByRole("button", { name: "Fortsett", exact: true });
    await next.click();
    const answer = async (name: string) => {
      await page.getByRole("button", { name, exact: true }).click();
      await next.click();
    };
    await answer(correct ? "La henne forklare med egne ord" : "Legg fram notatet og spør om bagen");
    await answer(correct ? "Finn ut hvem Ingrid snakket med" : "Følg observasjonen ved butikken");
    const reviewJonas = () => answer("Han ville skjule forholdet og samtalen");
    if (correct) await reviewJonas();
    await answer("Avgrense tidspunktet og lete etter bilen");
    await answer("Tidsrommet virker for kort");
    if (!correct) {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Hva forklarer Jonas’ løgn best?" })).toBeVisible();
      await reviewJonas();
    }
    for (const choice of ["Omtrent 32 km", "Det ekstra oppdraget er ubekreftet", "Sammenhold kjøpet, skaden og kjøringen med forklaringen", "Han beskriver påstigningen etter å ha benektet kontakt"]) {
      await answer(choice);
    }
    await expect(page.getByRole("heading", { name: "Hvem mener du er ansvarlig?" })).toBeVisible();
    await expect(page.getByText(/Ingrid ble frivillig med Lars/)).toHaveCount(0);
    const confirm = page.getByRole("button", { name: "Bekreft avgjørelsen" });
    await expect(confirm).toBeDisabled();
    await page.getByRole("radio", { name: correct ? "Lars Viken" : "Erik Halvorsen" }).check();
    await page.getByLabel("Kilde som støtter valget").selectOption("Tidsopplysningene");
    await page.getByLabel("Hva tror du utløste hendelsen?").selectOption(correct ? "accident" : "planned");
    if (!correct) {
      await page.route("**/verdict", route => route.fulfill({ status: 503 }));
      await confirm.click();
      await expect(page.getByRole("alert")).toContainText("Valget ditt er beholdt");
      await page.unroute("**/verdict");
      await expect(page.getByRole("radio", { name: "Erik Halvorsen" })).toBeChecked();
    }
    await confirm.click();
    await expect(page.getByRole("status")).toContainText("Vurderer avgjørelsen");
    const result = page.getByRole("heading", { name: correct ? "Du fant den ansvarlige" : "Du valgte feil person" });
    await expect(result).toBeVisible();
    await expect(page.getByText(/la være å tilkalle hjelp/)).toBeVisible();
    await expect(page.getByText(correct ? /identifiserte også/ : /passer ikke med rekonstruksjonen/)).toBeVisible();
    await page.reload();
    await expect(result).toBeVisible();
    await page.getByRole("button", { name: "Spill på nytt" }).click();
    await expect(page.getByRole("button", { name: "Start etterforskningen" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
