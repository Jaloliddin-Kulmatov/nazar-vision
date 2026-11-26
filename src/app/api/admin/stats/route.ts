import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled } from "@/lib/accounts/db";
import { adminConfigured, adminStats, isAdmin, listSignups } from "@/lib/accounts/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ ok: false, error: "no_admin_password" }, { status: 503 });
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!accountsEnabled()) return NextResponse.json({ ok: false, error: "no_database" }, { status: 503 });
  const days = [7, 30, 90].includes(Number(new URL(request.url).searchParams.get("days"))) ? Number(new URL(request.url).searchParams.get("days")) : 30;
  try {
    const [stats, signups] = await Promise.all([adminStats(days), listSignups()]);
    return NextResponse.json({ ok: true, stats, signups }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("[admin] stats failed", e);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 503 });
  }
}
