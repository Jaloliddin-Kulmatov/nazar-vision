import { site } from "@/config/site";

/** Email goes out through Resend when RESEND_API_KEY is set. */
export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);

/** Sends one email; returns false instead of throwing. RESEND_API_URL exists only for local tests. */
export async function sendMail(m: { to: string; subject: string; html: string; text?: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || `${site.name} <onboarding@resend.dev>`,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
