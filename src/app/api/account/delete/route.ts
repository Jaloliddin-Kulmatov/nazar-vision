import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, db } from "@/lib/accounts/db";
import { clearSessionCookie, readSession } from "@/lib/accounts/cookies";

export const dynamic = "force-dynamic";

/** Deletes the signed-in person's account, download history and any pending code, then signs them out. */
export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ ok: false, error: "signed_out" }, { status: 401 });
  if (!accountsEnabled()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  try {
    const s = await db();
    await s`delete from nazar_vision.signups where id = ${session.id}`;
    await s`delete from nazar_vision.email_codes where email = ${session.email}`;
  } catch (e) {
    console.error("[account/delete]", e);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
