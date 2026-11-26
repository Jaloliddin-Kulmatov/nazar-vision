import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Who is signed in, carried in a signed cookie (no database lookup per request). */
export type Session = { id: string; email: string; exp: number };

export const SESSION_COOKIE = "nv_session";
export const SESSION_DAYS = 365;

/** SESSION_SECRET if set; otherwise derived from the database URL, which is already a secret. */
function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!s) throw new Error("No SESSION_SECRET or DATABASE_URL set");
  return createHash("sha256").update(`nazar-vision-session:${s}`).digest("hex");
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function encodeSession(id: string, email: string, now = Date.now(), key = secret()): string {
  const payload = b64(JSON.stringify({ id, email, exp: now + SESSION_DAYS * 86_400_000 }));
  return `${payload}.${sign(payload, key)}`;
}

export function decodeSession(token: string | undefined, now = Date.now(), key?: string): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  let k: string;
  try {
    k = key ?? secret();
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(payload, k));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return typeof s.id === "string" && typeof s.email === "string" && s.exp > now ? s : null;
  } catch {
    return null;
  }
}
