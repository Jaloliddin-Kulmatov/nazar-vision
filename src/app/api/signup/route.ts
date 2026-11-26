import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, isUnreachable, upsertSignup } from "@/lib/accounts/db";
import { setSessionCookie } from "@/lib/accounts/cookies";
import { notifyNewSignup } from "@/lib/accounts/notify";
import { encodeSession } from "@/lib/accounts/session";
import { validateSignup } from "@/lib/accounts/signup";

export const dynamic = "force-dynamic";

/** Free sign-up for the source code: saves the person and signs them in on this browser. */
export async function POST(request: NextRequest) {
  if (!accountsEnabled()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const v = validateSignup(body);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  try {
    const { id, isNew } = await upsertSignup(v.data);
    if (isNew) await notifyNewSignup(v.data);
    const res = NextResponse.json({ ok: true, email: v.data.email });
    setSessionCookie(res, encodeSession(id, v.data.email), new URL(request.url).protocol === "https:");
    return res;
  } catch (e) {
    console.error("[signup] database error", e);
    return NextResponse.json({ ok: false, error: isUnreachable(e) ? "db_unreachable" : "db_error" }, { status: 503 });
  }
}
