import type { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE, SESSION_DAYS, type Session } from "./session";

export const readSession = (req: NextRequest): Session | null => decodeSession(req.cookies.get(SESSION_COOKIE)?.value);

export function setSessionCookie(res: NextResponse, token: string, secure: boolean) {
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86_400 });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Only allow redirects back into this site. */
export function safeNext(next: string | null, fallback: string) {
  return next && /^\/(en|ru|uz)(\/[\w-]*)*$/.test(next) ? next : fallback;
}
