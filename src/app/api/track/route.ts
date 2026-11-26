import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, databaseUrl, recordEvent } from "@/lib/accounts/db";
import { cleanClientEvent, dailyVisitorId, deviceOf, isBot } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Receives page views and demo runs from the browser (sent with navigator.sendBeacon). */
export async function POST(request: NextRequest) {
  const ok = new NextResponse(null, { status: 204 });
  if (!accountsEnabled()) return ok;
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return ok;
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return ok;
  }
  const e = cleanClientEvent(body, new URL(request.url).hostname);
  if (!e) return ok;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  await recordEvent({
    ...e,
    country: (request.headers.get("x-vercel-ip-country") ?? "").slice(0, 2),
    device: deviceOf(ua),
    visitor: dailyVisitorId(ip, ua, databaseUrl()),
  }).catch((err) => console.error("[track] could not record", err));
  return ok;
}
