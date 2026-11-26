import { contactEmailHtml, validateContact } from "@/lib/contact";
import { site } from "@/config/site";
import { accountsEnabled, recordEvent } from "@/lib/accounts/db";
import { mailEnabled, sendMail } from "@/lib/mail";

/**
 * Sends contact-form messages through Resend (https://resend.com).
 * Env: RESEND_API_KEY, CONTACT_TO_EMAIL, optional CONTACT_FROM_EMAIL (see src/lib/mail.ts).
 * Without a key it answers 503 so the form can point people to Telegram / email.
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

  if (!mailEnabled()) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  const d = result.data;
  const sent = await sendMail({
    to: process.env.CONTACT_TO_EMAIL || site.email,
    replyTo: d.email,
    subject: `New inquiry: ${d.company || d.name}${d.industry ? ` (${d.industry})` : ""}`,
    html: contactEmailHtml(d),
  });
  if (!sent) return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  if (accountsEnabled()) await recordEvent({ type: "contact", path: "/contact" }).catch(() => undefined);
  return Response.json({ ok: true });
}
