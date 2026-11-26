import { createHash } from "node:crypto";

/** Event types the browser may send. Everything else is dropped. */
export const CLIENT_EVENTS = ["pageview", "demo_run", "demo_error"] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime/i;

export function isBot(ua: string) {
  return !ua || BOT.test(ua);
}

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop";
}

/** Only the referring site's host, and nothing for internal navigation. */
export function referrerHost(ref: string, ownHost: string): string {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h && h !== ownHost.replace(/^www\./, "") ? h.slice(0, 120) : "";
  } catch {
    return "";
  }
}

/**
 * A visitor id that changes every day and can't be turned back into an IP address:
 * enough to count unique visitors per day, without cookies or storing IPs.
 */
export function dailyVisitorId(ip: string, ua: string, salt: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

export type CleanEvent = { type: ClientEvent; path: string; locale: string; demo: string; source: string; referrer: string };

/** Validates what the browser sent; returns null for anything unexpected. */
export function cleanClientEvent(body: unknown, ownHost: string): CleanEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!CLIENT_EVENTS.includes(b.type as ClientEvent)) return null;
  const path = clip(b.path, 200);
  if (!path.startsWith("/") || path.includes("/admin")) return null;
  const locale = path.split("/")[1] ?? "";
  return {
    type: b.type as ClientEvent,
    path,
    locale: ["en", "uz", "ru"].includes(locale) ? locale : "",
    demo: clip(b.demo, 60).replace(/[^a-z0-9-]/g, ""),
    source: clip(b.source, 40).replace(/[^a-zA-Z0-9_-]/g, ""),
    referrer: referrerHost(clip(b.referrer, 500), ownHost),
  };
}
