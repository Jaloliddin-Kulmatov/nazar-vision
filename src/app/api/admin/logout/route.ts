import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/accounts/admin";

export function POST() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
