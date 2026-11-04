import { expect, test } from "@playwright/test";

test("a completed interview can be compared with a chosen source without exposing another session's replies", async ({ page, browser, baseURL }, testInfo) => {
  const session = "/api/cases/1999-1218/investigation";
  const headers = { "X-ColdCase-Request":"1" };
  async function post(path:string, data:unknown = {}) { const response = await page.request.post(session + path, { headers, data }); expect(response.ok(), await response.text()).toBe(true); }
  await post(""); for (const id of ["hotel-log", "maria-statement"]) await post(`/evidence/${id}/review`);
  await post("/actions/find-note"); await post("/evidence/ingrid-note/review");
  const board = await (await page.request.get(session)).json();
  board.board.positions = [{ id:"person:maria", x:40, y:40 }, { id:"evidence:ingrid-note", x:280, y:40 }];
  board.board.connections = [{ id:"original", fromId:"person:maria", toId:"evidence:ingrid-note", label:"Undersøk notatet" }];
  expect((await page.request.put(session + "/board", { headers, data:board })).ok()).toBe(true);
  await page.goto("/cases/1999-1218/people/maria");
  await expect(page.getByRole("button", { name:"Prøv mot en kilde", exact:true })).toBeDisabled();
  await page.getByRole("button", { name:"Spør om notatet og den avtalte bagen", exact:true }).click();
  await page.getByRole("button", { name:"Gi Maria rom til å forklare", exact:true }).click();
  await expect(page.locator(".approach-receipt")).toContainText("Gi Maria rom til å forklare");
  const before = await (await page.request.get(session + "/progress")).json();
  for (const size of [{ width:1366, height:768 }, { width:1920, height:1080 }, { width:390, height:844 }]) {
    await page.setViewportSize(size); await page.goto("/cases/1999-1218/people/maria");
    await page.getByRole("button", { name:"Prøv mot en kilde", exact:true }).click();
    const picker = page.getByRole("dialog", { name:"Prøv forklaringen mot en kilde", exact:true });
    await expect(picker).toBeVisible(); await expect(picker).not.toContainText("Lars Viken");
    expect(await page.evaluate(() => ({x:document.documentElement.scrollWidth > innerWidth,y:document.documentElement.scrollHeight > innerHeight}))).toEqual({x:false,y:false});
    await page.screenshot({ path:testInfo.outputPath(`interview-source-picker-${size.width}.png`) });
    await picker.getByRole("link", { name:"Sammenlign med Bussbillett til Trondheim", exact:true }).click();
    const account = page.getByRole("region", { name:"Andre kilde", exact:true });
    await expect(account).toContainText("REGISTRERTE FORKLARINGER");
    await expect(account).toContainText("Bagen ble stående igjen");
    await expect(account).toContainText("Din tilnærming: Gi Maria rom til å forklare");
    await expect(page.getByRole("region", { name:"Første kilde", exact:true })).toContainText("Billetten ble ikke brukt");
    if (size.width === 1366) await page.screenshot({ path:testInfo.outputPath("interview-source-comparison.png") });
  }
  const after = await (await page.request.get(session + "/progress")).json();
  expect(after.history).toEqual(before.history); expect(after.reviewedEvidenceIds).toEqual(before.reviewedEvidenceIds);
  expect((await (await page.request.get(session)).json()).board.connections).toEqual(board.board.connections);
  const other = await browser.newContext({ baseURL }); const otherPage = await other.newPage();
  await otherPage.goto("/cases/1999-1218/evidence/bus-ticket?compare=1&with=person%3Amaria");
  const privateAccount = otherPage.getByRole("region", { name:"Andre kilde", exact:true });
  await expect(privateAccount).toContainText("Maria Nygård");
  await expect(privateAccount).not.toContainText("Bagen ble stående igjen");
  await expect(privateAccount).not.toContainText("Gi Maria rom til å forklare");
  await other.close();
});
