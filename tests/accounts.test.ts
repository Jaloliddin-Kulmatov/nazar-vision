import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/accounts/session";
import { validateSignup } from "@/lib/accounts/signup";

describe("session cookie", () => {
  const key = "test-key";
  it("round-trips and rejects tampering, other keys and expiry", () => {
    const now = 1_000_000;
    const token = encodeSession("id-1", "a@b.co", now, key);
    expect(decodeSession(token, now, key)).toMatchObject({ id: "id-1", email: "a@b.co" });
    expect(decodeSession(token, now, "other-key")).toBeNull();
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ id: "id-2", email: "x@y.co", exp: now * 10 })).toString("base64url");
    expect(decodeSession(`${forged}.${mac}`, now, key)).toBeNull();
    expect(decodeSession(`${payload}.`, now, key)).toBeNull();
    expect(decodeSession(token, now + 400 * 86_400_000, key)).toBeNull();
    expect(decodeSession(undefined, now, key)).toBeNull();
  });
});

describe("validateSignup", () => {
  it("accepts a name and email, trimming and lower-casing the email", () => {
    expect(validateSignup({ name: " Ali ", email: " Ali@Firm.UZ ", company: "Firm" })).toEqual({
      ok: true,
      data: { name: "Ali", email: "ali@firm.uz", company: "Firm" },
    });
  });
  it("rejects missing names, bad emails and bots", () => {
    expect(validateSignup({ name: "", email: "a@b.co" })).toEqual({ ok: false, error: "name_required" });
    expect(validateSignup({ name: "A", email: "nope" })).toEqual({ ok: false, error: "email_invalid" });
    expect(validateSignup({ name: "A", email: "a@b.co", website: "spam.com" })).toEqual({ ok: false, error: "spam" });
    expect(validateSignup(null)).toEqual({ ok: false, error: "invalid_body" });
  });
});
