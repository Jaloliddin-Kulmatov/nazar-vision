import { NextResponse, type NextRequest } from "next/server";
import { adminConfigured, passwordMatches, setAdminCookie } from "@/lib/accounts/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  let password = "";
  try {
    const b = (await request.json()) as { password?: unknown };
    password = typeof b.password === "string" ? b.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!passwordMatches(password)) {
    // Slow down password guessing.
    await new Promise((r) => setTimeout(r, 1200));
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res, new URL(request.url).protocol === "https:");
  return res;
}
