import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { databaseUrl } from "./db";

/** "Continue with Google" is on when both values from Google Cloud are set. */
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const OAUTH_COOKIE = "nv_oauth";
const b64url = (b: Buffer) => b.toString("base64url");

/** Random state and a PKCE pair: Google must hand back the same state, and only we know the verifier. */
export function newOAuthRequest() {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { state, verifier, challenge };
}

export function googleAuthUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string; locale: string }) {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: p.locale,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** The state cookie is signed so it can't be swapped for another browser's. */
const key = () => createHash("sha256").update(`nazar-vision-oauth:${process.env.GOOGLE_CLIENT_SECRET}:${databaseUrl()}`).digest();
export function packOAuthCookie(v: { state: string; verifier: string; next: string }) {
  const payload = Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}
export function unpackOAuthCookie(token: string | undefined): { state: string; verifier: string; next: string } | null {
  const [payload, mac] = (token ?? "").split(".");
  if (!payload || !mac) return null;
  const want = Buffer.from(createHmac("sha256", key()).update(payload).digest("base64url"));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export type GoogleProfile = { email: string; name: string };

/**
 * Checks the ID token Google returned from its token endpoint (fetched directly over TLS,
 * so per OpenID Connect the signature check can be skipped): issuer, audience, expiry and,
 * above all, that Google has verified the email.
 */
export function profileFromIdToken(idToken: string, clientId: string, now = Date.now()): GoogleProfile | null {
  const part = idToken.split(".")[1];
  if (!part) return null;
  let c: Record<string, unknown>;
  try {
    c = JSON.parse(Buffer.from(part, "base64url").toString());
  } catch {
    return null;
  }
  if (c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com") return null;
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(clientId)) return null;
  if (typeof c.exp !== "number" || c.exp * 1000 < now) return null;
  if (c.email_verified !== true && c.email_verified !== "true") return null;
  if (typeof c.email !== "string" || !c.email.includes("@")) return null;
  const email = c.email.toLowerCase();
  const name = (typeof c.name === "string" && c.name.trim()) || email.split("@")[0];
  return { email, name: name.slice(0, 120) };
}

/** Where Google sends people back. Every address used here must be listed in Google Cloud. */
export const redirectUri = (origin: string) => `${process.env.GOOGLE_REDIRECT_ORIGIN || origin}/api/auth/google/callback`;
