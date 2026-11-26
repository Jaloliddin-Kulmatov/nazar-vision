import { site } from "@/config/site";
import { sendMail } from "@/lib/mail";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Emails the owner about a new sign-up when Resend is set up. Never throws. */
export async function notifyNewSignup(d: { name: string; email: string; company: string; provider?: string }) {
  const to = process.env.CONTACT_TO_EMAIL || site.email;
  if (!to) return;
  await sendMail({
    to,
    replyTo: d.email,
    subject: `New code sign-up: ${d.company || d.name}`,
    html: `<p><b>${esc(d.name)}</b>${d.company ? ` (${esc(d.company)})` : ""} signed up to download the demo code${d.provider === "google" ? " with Google" : ""}.</p><p>${esc(d.email)}</p>`,
  });
}
