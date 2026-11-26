import { site } from "@/config/site";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Emails the owner about a new sign-up when Resend is set up. Never throws. */
export async function notifyNewSignup(d: { name: string; email: string; company: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || `${site.name} <onboarding@resend.dev>`,
        to: [process.env.CONTACT_TO_EMAIL || site.email],
        reply_to: d.email,
        subject: `New code sign-up: ${d.company || d.name}`,
        html: `<p><b>${esc(d.name)}</b>${d.company ? ` (${esc(d.company)})` : ""} signed up to download the demo code.</p><p>${esc(d.email)}</p>`,
      }),
    });
  } catch {
    // A missed notification must not break sign-up.
  }
}
