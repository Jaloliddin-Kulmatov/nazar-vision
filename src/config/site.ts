/**
 * Everything brand- or business-specific lives here.
 *
 * Contact channels come from environment variables, so they can be set in Vercel without a code change.
 * A channel that is not set is simply not shown (no dead "your_handle" links on the live site).
 *   NEXT_PUBLIC_CONTACT_EMAIL   hello@yourcompany.uz
 *   NEXT_PUBLIC_TELEGRAM        your_username  or  https://t.me/your_username
 *   NEXT_PUBLIC_WHATSAPP        998901234567   or  https://wa.me/998901234567
 *   NEXT_PUBLIC_BOOK_CALL_URL   https://cal.com/you/intro
 *   NEXT_PUBLIC_SITE_URL        https://nazarvision.uz  (your own domain, once connected; used in links, sitemap and previews)
 */

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function telegramUrl(v: string | null) {
  if (!v) return null;
  if (/^https?:\/\//.test(v)) return v;
  return `https://t.me/${v.replace(/^@/, "")}`;
}

function whatsappUrl(v: string | null) {
  if (!v) return null;
  if (/^https?:\/\//.test(v)) return v;
  const digits = v.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export const site = {
  name: "Nazar Vision",
  shortName: "Nazar",
  url: (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://nazar-vision.vercel.app").replace(/\/$/, ""),
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  telegram: telegramUrl(clean(process.env.NEXT_PUBLIC_TELEGRAM)),
  whatsapp: whatsappUrl(clean(process.env.NEXT_PUBLIC_WHATSAPP)),
  bookCall: clean(process.env.NEXT_PUBLIC_BOOK_CALL_URL),
  github: "https://github.com/Jaloliddin-Kulmatov/nazar-vision",
} as const;

export type Site = typeof site;
