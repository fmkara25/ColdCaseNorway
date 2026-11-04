import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchJson, formatDate, isCaseFile, isCaseList } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("case API", () => {
  it("passes cancellation to fetch and returns server data", async () => {
    const signal = new AbortController().signal;
    const payload = [{ id: "1999-1218" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchJson("/api/cases", signal)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/cases", { signal });
  });

  it.each([404, 500])("rejects HTTP %i rather than treating it as a case", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    await expect(fetchJson("/api/cases/unknown")).rejects.toMatchObject({ status });
    await expect(fetchJson("/api/cases/unknown")).rejects.toBeInstanceOf(ApiError);
  });

  it("preserves network failures for retry feedback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    await expect(fetchJson("/api/cases")).rejects.toThrow("network");
  });

  it("formats the case date in Bokmål without a timezone date shift", () => {
    expect(formatDate("1999-12-18")).toBe("18. desember 1999");
  });
});

const validCase = {
  id: "1999-1218", title: "Forsvinningen i Skardal", location: "Skardal",
  disappearanceDate: "1999-12-18", missingPerson: "Ingrid Solberg", age: 23,
  summary: "Uoppklart", initialReport: "Savnet."
};

it("validates successful API payloads before rendering", async () => {
  expect(isCaseFile(validCase)).toBe(true);
  expect(isCaseList([validCase])).toBe(true);
  expect(isCaseFile({ ...validCase, disappearanceDate: "1999-02-31" })).toBe(false);
  expect(isCaseFile({ ...validCase, missingPerson: null })).toBe(false);
  expect(isCaseFile({ ...validCase, initialReport: undefined })).toBe(false);
  expect(isCaseList({ message: "error" })).toBe(false);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "wrong shape" }))));
  await expect(fetchJson("/api/cases", undefined, isCaseList)).rejects.toThrow("Ugyldige saksopplysninger.");
});

it("rejects an HTML fallback instead of returning it as a case", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html><html></html>")));
  await expect(fetchJson("/api/cases", undefined, isCaseList)).rejects.toThrow();
});
