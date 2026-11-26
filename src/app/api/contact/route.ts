import { contactEmailHtml, validateContact } from "@/lib/contact";
import { site } from "@/config/site";
import { accountsEnabled, recordEvent, saveInquiry } from "@/lib/accounts/db";
import { mailEnabled, sendMail } from "@/lib/mail";
import { allow, LIMITS } from "@/lib/rateLimit";

/**
 * Contact-form messages. Each one is saved to the database (shown on the owner's dashboard)
 * and, when Resend is set up (RESEND_API_KEY, CONTACT_TO_EMAIL), also emailed.
 * Either one is enough; with neither, the form answers 503 and points people to Telegram / email.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = validateContact(body);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
  if (!(await allow(request, LIMITS.contact))) return Response.json({ ok: false, error: "too_many" }, { status: 429 });

  const d = result.data;
  const to = process.env.CONTACT_TO_EMAIL || site.email;
  const emailed =
    mailEnabled() && to
      ? await sendMail({
          to,
          replyTo: d.email,
          subject: `New inquiry: ${d.company || d.name}${d.industry ? ` (${d.industry})` : ""}`,
          html: contactEmailHtml(d),
        })
      : false;

  let saved = false;
  if (accountsEnabled()) {
    try {
      await saveInquiry(d, emailed);
      saved = true;
      await recordEvent({ type: "contact", path: "/contact" }).catch(() => undefined);
    } catch (e) {
      console.error("[contact] could not save inquiry", e);
    }
  }

  if (!emailed && !saved) {
    const tried = mailEnabled() && to;
    return Response.json({ ok: false, error: tried ? "send_failed" : "not_configured" }, { status: tried ? 502 : 503 });
  }
  return Response.json({ ok: true });
}
