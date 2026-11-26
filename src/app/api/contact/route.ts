import { contactEmailHtml, validateContact } from "@/lib/contact";
import { site } from "@/config/site";

/**
 * Sends contact-form messages through Resend (https://resend.com).
 * Env: RESEND_API_KEY, CONTACT_TO_EMAIL, optional CONTACT_FROM_EMAIL.
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

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || site.email;
  if (!key) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  const d = result.data;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || `${site.name} <onboarding@resend.dev>`,
        to: [to],
        reply_to: d.email,
        subject: `New inquiry: ${d.company || d.name}${d.industry ? ` (${d.industry})` : ""}`,
        html: contactEmailHtml(d),
      }),
    });
    if (!res.ok) return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  } catch {
    return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
