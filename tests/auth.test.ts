import { promises as dns } from "node:dns";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkEmail, isDisposable, suggestEmail } from "@/lib/accounts/emailCheck";
import { googleAuthUrl, newOAuthRequest, packOAuthCookie, profileFromIdToken, unpackOAuthCookie } from "@/lib/accounts/google";
import { safeNext } from "@/lib/accounts/cookies";

afterEach(() => vi.restoreAllMocks());

describe("email checks", () => {
  it("suggests the provider people most likely meant", () => {
    expect(suggestEmail("ali@gmial.com")).toBe("ali@gmail.com");
    expect(suggestEmail("ali@gmail.co")).toBe("ali@gmail.com");
    expect(suggestEmail("olga@mail.rr")).toBe("olga@mail.ru");
    expect(suggestEmail("olga@yandex.ru")).toBeNull();
    expect(suggestEmail("ceo@textile-group.uz")).toBeNull();
  });

  it("knows throwaway inboxes", async () => {
    expect(await isDisposable("mailinator.com")).toBe(true);
    expect(await isDisposable("gmail.com")).toBe(false);
  });

  it("rejects bad syntax, throwaway inboxes, typos and domains without mail", async () => {
    vi.spyOn(dns, "resolveMx").mockImplementation(async (d: string) => {
      if (d === "real.uz") return [{ exchange: "mx.real.uz", priority: 10 }];
      throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
    });
    vi.spyOn(dns, "resolve4").mockRejectedValue(Object.assign(new Error("nope"), { code: "ENOTFOUND" }));
    expect(await checkEmail("not an email")).toEqual({ ok: false, reason: "syntax" });
    expect(await checkEmail("x@mailinator.com")).toEqual({ ok: false, reason: "disposable" });
    expect(await checkEmail("ali@gmial.com")).toEqual({ ok: false, reason: "typo", suggestion: "ali@gmail.com" });
    expect(await checkEmail("ali@no-such-domain-here.uz")).toEqual({ ok: false, reason: "no_mail_server" });
    expect(await checkEmail(" Ali@Real.UZ ")).toEqual({ ok: true, email: "ali@real.uz" });
  });

  it("lets people keep an address that only looks like a typo", async () => {
    vi.spyOn(dns, "resolveMx").mockResolvedValue([{ exchange: "mx.gmial.com", priority: 10 }]);
    expect(await checkEmail("ali@gmial.com", true)).toEqual({ ok: true, email: "ali@gmial.com" });
  });

  it("doesn't turn people away when our DNS is having trouble", async () => {
    vi.spyOn(dns, "resolveMx").mockRejectedValue(Object.assign(new Error("timeout"), { code: "ETIMEOUT" }));
    expect(await checkEmail("ali@company.uz")).toEqual({ ok: true, email: "ali@company.uz" });
  });
});

describe("Google sign-in", () => {
  const token = (claims: Record<string, unknown>) =>
    `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
  const now = 1_800_000_000_000;
  const good = { iss: "https://accounts.google.com", aud: "client-1", exp: now / 1000 + 600, email: "Ali@Gmail.com", email_verified: true, name: "Ali Valiyev" };

  it("accepts a verified Google account and reads its email and name", () => {
    expect(profileFromIdToken(token(good), "client-1", now)).toEqual({ email: "ali@gmail.com", name: "Ali Valiyev" });
  });

  it("rejects other apps, other issuers, expired tokens and unverified emails", () => {
    expect(profileFromIdToken(token({ ...good, aud: "someone-else" }), "client-1", now)).toBeNull();
    expect(profileFromIdToken(token({ ...good, iss: "https://evil.example" }), "client-1", now)).toBeNull();
    expect(profileFromIdToken(token({ ...good, exp: now / 1000 - 1 }), "client-1", now)).toBeNull();
    expect(profileFromIdToken(token({ ...good, email_verified: false }), "client-1", now)).toBeNull();
    expect(profileFromIdToken("garbage", "client-1", now)).toBeNull();
  });

  it("builds Google's consent link with PKCE and the state", () => {
    const { state, challenge } = newOAuthRequest();
    const url = new URL(googleAuthUrl({ clientId: "client-1", redirectUri: "https://site/api/auth/google/callback", state, challenge, locale: "uz" }));
    expect(url.host).toBe("accounts.google.com");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("signs the state cookie so it can't be forged", () => {
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.DATABASE_URL = "postgres://x";
    const packed = packOAuthCookie({ state: "s", verifier: "v", next: "/en/code" });
    expect(unpackOAuthCookie(packed)).toEqual({ state: "s", verifier: "v", next: "/en/code" });
    const [, mac] = packed.split(".");
    const forged = Buffer.from(JSON.stringify({ state: "s", verifier: "x", next: "/en/code" })).toString("base64url");
    expect(unpackOAuthCookie(`${forged}.${mac}`)).toBeNull();
  });

  it("only sends people back to pages on this site", () => {
    expect(safeNext("/ru/account", "/en/code")).toBe("/ru/account");
    expect(safeNext("//evil.com", "/en/code")).toBe("/en/code");
    expect(safeNext("https://evil.com", "/en/code")).toBe("/en/code");
    expect(safeNext("/en/code?x=1", "/en/code")).toBe("/en/code");
  });
});
