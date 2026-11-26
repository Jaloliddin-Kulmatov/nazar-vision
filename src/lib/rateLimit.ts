import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { accountsEnabled, countHit } from "@/lib/accounts/db";

/**
 * Per-visitor limits for endpoints a bot could abuse (sending codes, the contact form).
 * The visitor is a salted hash of their IP address: the IP itself is never stored.
 * With a database the count is shared by every server instance; without one it is kept
 * in memory, which still stops a single noisy client.
 */

export type Limit = { name: string; max: number; windowSec: number };

export const LIMITS = {
  emailStart: { name: "email-start", max: 10, windowSec: 3600 },
  emailVerify: { name: "email-verify", max: 30, windowSec: 3600 },
  contact: { name: "contact", max: 5, windowSec: 3600 },
} as const satisfies Record<string, Limit>;

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function visitorKey(limit: Limit, ip: string): string {
  const salt = process.env.SESSION_SECRET || process.env.DATABASE_URL || "nazar-vision";
  return `${limit.name}:${createHash("sha256").update(`rl|${ip}|${salt}`).digest("hex").slice(0, 32)}`;
}

const memory = new Map<string, { start: number; hits: number }>();

/** In-memory fixed window, used when there is no database (and in tests). */
export function memoryHit(key: string, windowSec: number, now = Date.now()): number {
  const cur = memory.get(key);
  if (!cur || now - cur.start >= windowSec * 1000) {
    memory.set(key, { start: now, hits: 1 });
    if (memory.size > 5000) for (const [k, v] of memory) if (now - v.start >= windowSec * 1000) memory.delete(k);
    return 1;
  }
  cur.hits++;
  return cur.hits;
}

/** True when this request is still within the limit. Never throws: if counting fails, the request is let through. */
export async function allow(req: NextRequest | Request, limit: Limit): Promise<boolean> {
  const key = visitorKey(limit, clientIp(req));
  try {
    const hits = accountsEnabled() ? await countHit(key, limit.windowSec) : memoryHit(key, limit.windowSec);
    return hits <= limit.max;
  } catch (e) {
    console.error("[rate-limit] count failed", e);
    return memoryHit(key, limit.windowSec) <= limit.max;
  }
}
