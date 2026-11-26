import { NextResponse, type NextRequest } from "next/server";
import { recordEvent, upsertSignup } from "./db";
import { setSessionCookie } from "./cookies";
import { notifyNewSignup } from "./notify";
import { encodeSession } from "./session";

/** Saves (or refreshes) the person, tells the owner about new ones, and returns the signed-in response. */
export async function finishSignup(
  request: NextRequest,
  d: { name: string; email: string; company: string; provider: "email" | "google"; verified: boolean },
  response: NextResponse,
) {
  const { id, isNew } = await upsertSignup(d);
  if (isNew) {
    await notifyNewSignup(d);
    await recordEvent({ type: "signup", path: "/code", source: d.provider, country: (request.headers.get("x-vercel-ip-country") ?? "").slice(0, 2) }).catch(() => undefined);
  }
  signIn(request, response, id, d.email);
  return response;
}

export function signIn(request: NextRequest, response: NextResponse, id: string, email: string) {
  setSessionCookie(response, encodeSession(id, email), new URL(request.url).protocol === "https:");
}
