import { createHash, randomInt } from "node:crypto";
import { db, databaseUrl } from "./db";

export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_DAY = 6;
const RESEND_AFTER_SECONDS = 45;

/** What the person typed before confirming their email; applied once the code checks out. */
export type CodePayload = { mode: "signup" | "signin"; name: string; company: string; locale: string };

const hash = (email: string, code: string) => createHash("sha256").update(`nazar-vision-code:${databaseUrl()}:${email}:${code}`).digest("hex");

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export type StartResult = { ok: true; code: string } | { ok: false; error: "too_soon" | "too_many" };

/** Stores a fresh code for this email (replacing any earlier one) unless it was asked for too often. */
export async function storeCode(email: string, payload: CodePayload, code = newCode()): Promise<StartResult> {
  const s = await db();
  const [prev] = await s<{ sent_at: Date; sends_today: number; day: string }[]>`
    select sent_at, sends_today, day::text from nazar_vision.email_codes where email = ${email}`;
  const today = new Date().toISOString().slice(0, 10);
  if (prev) {
    if (Date.now() - new Date(prev.sent_at).getTime() < RESEND_AFTER_SECONDS * 1000) return { ok: false, error: "too_soon" };
    if (prev.day === today && prev.sends_today >= MAX_SENDS_PER_DAY) return { ok: false, error: "too_many" };
  }
  const sends = prev && prev.day === today ? prev.sends_today + 1 : 1;
  await s`
    insert into nazar_vision.email_codes (email, code_hash, payload, expires_at, attempts, sent_at, sends_today, day)
    values (${email}, ${hash(email, code)}, ${s.json(payload)}, now() + ${`${CODE_MINUTES} minutes`}::interval, 0, now(), ${sends}, ${today}::date)
    on conflict (email) do update set code_hash = excluded.code_hash, payload = excluded.payload,
      expires_at = excluded.expires_at, attempts = 0, sent_at = now(), sends_today = excluded.sends_today, day = excluded.day`;
  return { ok: true, code };
}

export type VerifyResult = { ok: true; payload: CodePayload } | { ok: false; error: "expired" | "wrong_code" | "too_many_attempts" };

/** Checks a typed code. Five wrong tries and the code is dead; a right one is used up. */
export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const s = await db();
  const [row] = await s<{ code_hash: string; payload: CodePayload; expired: boolean; attempts: number }[]>`
    select code_hash, payload, expires_at < now() as expired, attempts from nazar_vision.email_codes where email = ${email}`;
  if (!row || row.expired) return { ok: false, error: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts" };
  if (!/^\d{6}$/.test(code) || hash(email, code) !== row.code_hash) {
    await s`update nazar_vision.email_codes set attempts = attempts + 1 where email = ${email}`;
    return { ok: false, error: row.attempts + 1 >= MAX_ATTEMPTS ? "too_many_attempts" : "wrong_code" };
  }
  await s`update nazar_vision.email_codes set expires_at = now() - interval '1 second', attempts = ${MAX_ATTEMPTS} where email = ${email}`;
  return { ok: true, payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload };
}
