import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, findSignupByEmail, isUnreachable } from "@/lib/accounts/db";
import { verifyCode } from "@/lib/accounts/codes";
import { finishSignup, signIn } from "@/lib/accounts/signin";

export const dynamic = "force-dynamic";

/** Step 2: the 6-digit code from the email. A right code confirms the address and signs the person in. */
export async function POST(request: NextRequest) {
  if (!accountsEnabled()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!email || !code) return NextResponse.json({ ok: false, error: "wrong_code" }, { status: 400 });
  try {
    const v = await verifyCode(email, code);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    const res = NextResponse.json({ ok: true, email });
    if (v.payload.mode === "signin") {
      const found = await findSignupByEmail(email, true);
      if (!found) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      signIn(request, res, found.id, found.email);
      return res;
    }
    return finishSignup(request, { name: v.payload.name, email, company: v.payload.company, provider: "email", verified: true }, res);
  } catch (e) {
    console.error("[auth/email/verify]", e);
    return NextResponse.json({ ok: false, error: isUnreachable(e) ? "db_unreachable" : "db_error" }, { status: 503 });
  }
}
