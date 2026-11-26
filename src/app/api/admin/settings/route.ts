import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/accounts/admin";
import { setSetting } from "@/lib/accounts/db";

export const dynamic = "force-dynamic";

/** Owner switches. Today: whether new people may sign up. */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { signupsOpen?: unknown };
  if (typeof b.signupsOpen !== "boolean") return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  await setSetting("signups_open", b.signupsOpen ? "yes" : "no");
  return NextResponse.json({ ok: true, signupsOpen: b.signupsOpen });
}
