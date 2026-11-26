import { afterEach, describe, expect, it, vi } from "vitest";
import { validateContact } from "@/lib/contact";
import { POST } from "@/app/api/contact/route";

const valid = { name: "Aziz", email: "aziz@company.uz", message: "Count people at 3 doors", company: "Shop", industry: "retail" };

describe("validateContact", () => {
  it("accepts a complete message", () => {
    const r = validateContact(valid);
    expect(r.ok).toBe(true);
  });
  it("rejects a missing email", () => {
    expect(validateContact({ ...valid, email: "" }).ok).toBe(false);
  });
  it("rejects a malformed email", () => {
    expect(validateContact({ ...valid, email: "not-an-email" }).ok).toBe(false);
  });
  it("rejects an empty message or name", () => {
    expect(validateContact({ ...valid, message: "   " }).ok).toBe(false);
    expect(validateContact({ ...valid, name: "" }).ok).toBe(false);
  });
  it("rejects messages over 5000 characters", () => {
    expect(validateContact({ ...valid, message: "x".repeat(5001) }).ok).toBe(false);
  });
  it("rejects non-object bodies", () => {
    expect(validateContact(null).ok).toBe(false);
    expect(validateContact("hi").ok).toBe(false);
  });
  it("treats a filled honeypot as spam", () => {
    expect(validateContact({ ...valid, website: "http://spam" }).ok).toBe(false);
  });
});

describe("POST /api/contact", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const req = (body: unknown) =>
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  it("returns 400 for invalid input", async () => {
    const res = await POST(req({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for broken JSON", async () => {
    const res = await POST(req("{oops"));
    expect(res.status).toBe(400);
  });

  it("returns 503 when email sending isn't configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await POST(req(valid));
    expect(res.status).toBe(503);
  });

  it("sends through Resend when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "team@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body).reply_to).toBe("aziz@company.uz");
  });

  it("returns 502 when Resend fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "team@example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 500 })));
    const res = await POST(req(valid));
    expect(res.status).toBe(502);
  });
});

describe("project brief fields", () => {
  it("keeps the optional brief fields, trimmed and capped", async () => {
    const { validateContact, contactEmailHtml } = await import("@/lib/contact");
    const r = validateContact({
      name: "Aziz", email: "aziz@company.uz", message: "Count bottles",
      need: " pilot ", cameras: "2 lines, 6 cameras", timeline: "quarter", budget: "b2".repeat(100),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.need).toBe("pilot");
    expect(r.data.budget.length).toBe(60);
    const html = contactEmailHtml(r.data);
    expect(html).toContain("Cameras / lines");
    expect(html).toContain("2 lines, 6 cameras");
    expect(html).not.toContain("Phone / Telegram"); // empty fields are left out
  });
});
