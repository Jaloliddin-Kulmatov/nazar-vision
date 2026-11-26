import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, findSignupByEmail, isUnreachable } from "@/lib/accounts/db";
import { setSessionCookie } from "@/lib/accounts/cookies";
import { encodeSession } from "@/lib/accounts/session";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Signs in someone who signed up before (on another device, or after signing out). */
export async function POST(request: NextRequest) {
  if (!accountsEnabled()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  let email = "";
  try {
    const b = (await request.json()) as { email?: unknown };
    email = typeof b.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!EMAIL.test(email)) return NextResponse.json({ ok: false, error: "email_invalid" }, { status: 400 });
  try {
    const found = await findSignupByEmail(email);
    if (!found) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const res = NextResponse.json({ ok: true, email: found.email });
    setSessionCookie(res, encodeSession(found.id, found.email), new URL(request.url).protocol === "https:");
    return res;
  } catch (e) {
    console.error("[signin] database error", e);
    return NextResponse.json({ ok: false, error: isUnreachable(e) ? "db_unreachable" : "db_error" }, { status: 503 });
  }
}
