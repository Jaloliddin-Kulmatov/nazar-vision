/**
 * Everything brand- or business-specific lives here.
 * Swap the placeholder name and contacts in one place.
 */
export const site = {
  name: "Nazar Vision",
  shortName: "Nazar",
  url: "https://nazar-vision.vercel.app",
  email: "hello@example.com",
  telegram: "https://t.me/your_handle",
  whatsapp: "https://wa.me/998000000000",
  bookCall: "https://cal.com/your-link/intro",
  github: "https://github.com/",
} as const;

export type Site = typeof site;
