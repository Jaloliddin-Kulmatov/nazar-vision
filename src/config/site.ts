/**
 * Everything brand- or business-specific lives here.
 * Swap the placeholder name, contacts and prices in one place.
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
  /** Shown on the site. Keep `priceValues` (USD numbers, used by the ROI calculator) in step. */
  prices: {
    pilot: "$1,500",
    deployment: "$6,000",
    care: "$150",
  },
  priceValues: {
    pilot: 1500,
    deployment: 6000,
    care: 150,
  },
} as const;

export type Site = typeof site;
