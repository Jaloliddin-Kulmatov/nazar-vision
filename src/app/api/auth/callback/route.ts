import { NextResponse, type NextRequest } from "next/server";
import { safeNext, serverClient } from "@/lib/supabase/server";

/** The link in the sign-in email lands here; we swap its one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), "/en/code");
  const code = url.searchParams.get("code");
  const supabase = await serverClient();
  if (!supabase || !code) return NextResponse.redirect(new URL(`${next}?signin=failed`, url.origin));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? `${next}?signin=failed` : `${next}?signin=ok`, url.origin));
}
