import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, getSetting } from "@/lib/accounts/db";
import { googleEnabled } from "@/lib/accounts/google";
import { mailEnabled } from "@/lib/mail";
import { readSession } from "@/lib/accounts/cookies";

export const dynamic = "force-dynamic";

/** Whether sign-up is switched on, and who (if anyone) is signed in on this browser. */
export async function GET(request: NextRequest) {
  const enabled = accountsEnabled();
  const session = enabled ? readSession(request) : null;
  const signupOpen = enabled ? (await getSetting("signups_open", "yes").catch(() => "yes")) === "yes" : false;
  return NextResponse.json({ enabled, signupOpen, google: enabled && googleEnabled(), emailCodes: enabled && mailEnabled(), email: session?.email ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
