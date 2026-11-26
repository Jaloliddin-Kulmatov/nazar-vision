import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, findSignupByEmail, getSetting, isUnreachable } from "@/lib/accounts/db";
import { checkEmail } from "@/lib/accounts/emailCheck";
import { storeCode } from "@/lib/accounts/codes";
import { codeEmail } from "@/lib/accounts/codeEmail";
import { finishSignup, signIn } from "@/lib/accounts/signin";
import { validateSignup } from "@/lib/accounts/signup";
import { mailEnabled, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ ok: false, error, ...extra }, { status });

/**
 * Step 1 of email sign-up or sign-in. The email is checked (format, real mail server,
 * no throwaway inbox, likely typos). With email sending set up, a 6-digit code goes out and
 * step 2 (/verify) finishes; without it, the person is signed in straight away.
 */
export async function POST(request: NextRequest) {
  if (!accountsEnabled()) return fail("not_configured", 503);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("invalid_json");
  const mode = body.mode === "signin" ? "signin" : "signup";
  const locale = ["en", "ru", "uz"].includes(String(body.locale)) ? String(body.locale) : "en";

  let name = "";
  let company = "";
  if (mode === "signup") {
    const v = validateSignup(body);
    if (!v.ok) return fail(v.error);
    name = v.data.name;
    company = v.data.company;
  }

  const check = await checkEmail(String(body.email ?? ""), body.acceptTypo === true);
  if (!check.ok) return fail(`email_${check.reason}`, 400, check.suggestion ? { suggestion: check.suggestion } : {});
  const email = check.email;

  try {
    const existing = await findSignupByEmail(email);
    if (mode === "signin" && !existing) return fail("not_found", 404);
    if (mode === "signup" && !existing && (await getSetting("signups_open", "yes")) !== "yes") return fail("closed", 403);

    if (mailEnabled()) {
      const stored = await storeCode(email, { mode, name, company, locale });
      if (!stored.ok) return fail(stored.error, 429);
      const sent = await sendMail({ to: email, ...codeEmail(stored.code, locale) });
      if (!sent) return fail("send_failed", 502);
      return NextResponse.json({ ok: true, step: "code", email });
    }

    // No email sending yet: trust the checked address and sign in now.
    const res = NextResponse.json({ ok: true, step: "done", email });
    if (mode === "signin" && existing) {
      signIn(request, res, existing.id, existing.email);
      return res;
    }
    return finishSignup(request, { name, email, company, provider: "email", verified: false }, res);
  } catch (e) {
    console.error("[auth/email/start]", e);
    return fail(isUnreachable(e) ? "db_unreachable" : "db_error", 503);
  }
}
