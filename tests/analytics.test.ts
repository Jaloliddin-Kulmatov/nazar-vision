import { describe, expect, it } from "vitest";
import { cleanClientEvent, dailyVisitorId, deviceOf, isBot, referrerHost } from "@/lib/analytics";
import { toCsv } from "@/lib/accounts/admin";

describe("cleanClientEvent", () => {
  it("keeps known events and strips everything else", () => {
    expect(cleanClientEvent({ type: "demo_run", path: "/ru/demos/safety-zone", demo: "safety-zone", source: "webcam", referrer: "https://www.google.com/search?q=x" }, "nazar-vision.vercel.app")).toEqual({
      type: "demo_run",
      path: "/ru/demos/safety-zone",
      locale: "ru",
      demo: "safety-zone",
      source: "webcam",
      referrer: "google.com",
    });
  });
  it("drops unknown types, bad paths and admin pages", () => {
    expect(cleanClientEvent({ type: "signup", path: "/en" }, "x")).toBeNull();
    expect(cleanClientEvent({ type: "pageview", path: "https://evil.com" }, "x")).toBeNull();
    expect(cleanClientEvent({ type: "pageview", path: "/en/admin" }, "x")).toBeNull();
    expect(cleanClientEvent("nope", "x")).toBeNull();
  });
  it("removes odd characters from demo and source", () => {
    expect(cleanClientEvent({ type: "demo_run", path: "/en", demo: "<script>", source: "a b;c" }, "x")).toMatchObject({ demo: "script", source: "abc" });
  });
});

describe("helpers", () => {
  it("hides internal referrers and keeps only the host", () => {
    expect(referrerHost("https://nazar-vision.vercel.app/en", "nazar-vision.vercel.app")).toBe("");
    expect(referrerHost("https://t.me/somechannel/12", "nazar-vision.vercel.app")).toBe("t.me");
    expect(referrerHost("not a url", "x")).toBe("");
  });
  it("tells devices and bots apart", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("desktop");
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("")).toBe(true);
  });
  it("gives the same visitor the same id within a day and a new one the next day", () => {
    const a = dailyVisitorId("1.2.3.4", "ua", "salt", new Date("2026-11-26T08:00:00Z"));
    expect(dailyVisitorId("1.2.3.4", "ua", "salt", new Date("2026-11-26T20:00:00Z"))).toBe(a);
    expect(dailyVisitorId("1.2.3.4", "ua", "salt", new Date("2026-11-27T08:00:00Z"))).not.toBe(a);
    expect(a).not.toContain("1.2.3.4");
  });
});

describe("toCsv", () => {
  it("quotes cells and defuses spreadsheet formulas", () => {
    const csv = toCsv([
      { id: "1", name: '=HYPERLINK("x")', email: "a@b.co", company: 'Acme "Ltd"', created_at: "2026-11-26T00:00:00Z", last_seen_at: "2026-11-26T00:00:00Z", downloads: 2 },
    ]);
    expect(csv.split("\n")[0]).toBe("name,email,company,signed_up,last_seen,downloads");
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"Acme ""Ltd"""`);
  });
});
