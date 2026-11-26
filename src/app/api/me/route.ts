import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled } from "@/lib/accounts/db";
import { readSession } from "@/lib/accounts/cookies";

export const dynamic = "force-dynamic";

/** Whether sign-up is switched on, and who (if anyone) is signed in on this browser. */
export function GET(request: NextRequest) {
  const enabled = accountsEnabled();
  const session = enabled ? readSession(request) : null;
  return NextResponse.json({ enabled, email: session?.email ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
