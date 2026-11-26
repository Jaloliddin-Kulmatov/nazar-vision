# Nazar Vision — computer vision & robot perception website

Marketing site for a computer-vision firm, in English, Uzbek and Russian. It has 14 live in-browser demos (with sample videos), a services section built for selling pilots, 36 use cases and a licence-aware open-source library.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest: translations, repo filters, contact API, demo logic
npm run build
```

## Make it yours

| What | Where |
|---|---|
| Brand name, email, Telegram, WhatsApp, booking link, prices (pilot, deployment, care plan) | `src/config/site.ts`. Keep `priceValues` in step with `prices`: the ROI calculator uses them |
| All copy (EN / UZ / RU) | `messages/{en,uz,ru}.json`. `npm test` fails if a key is missing in one language |
| Industries, demos, services, use cases, sample videos | `src/lib/content.ts` |
| Open-source repo list | `scripts/catalog.mjs`, then `npm run repos:update` (uses `gh auth token` or `GITHUB_TOKEN`) |
| Colours and fonts | `src/app/globals.css` and `src/app/[locale]/layout.tsx` |

## Contact form

It sends email through [Resend](https://resend.com). Set these in Vercel → Project → Environment Variables:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`: where inquiries go
- `CONTACT_FROM_EMAIL` (optional): a sender on your verified domain

Without a key, the form tells visitors to use Telegram or email instead.

## Demos

All demos run client-side. Models download on first use from Google (MediaPipe), Hugging Face (Transformers.js) and jsDelivr (Tesseract, ZXing). Images never leave the device.

Sample images are hot-linked from the public `Xenova/transformers.js-docs` dataset on Hugging Face. Replace them with your own photos in `src/lib/content.ts` before launch.

Sample videos live in `public/videos/` (about 20 MB, Pexels licence; sources in `public/videos/CREDITS.md`). They are served from the site itself because browsers block frame analysis on videos from other domains. Your own factory footage will sell better: drop MP4s in the same folder and update `videos` in `src/lib/content.ts`.

The PPE demo downloads OWLv2 (163 MB) on first use; the other new demos are 4–22 MB.

## Docs

- `docs/superpowers/specs/2026-11-24-cv-firm-site-design.md`: design
- `docs/superpowers/plans/2026-11-24-cv-firm-site.md`: implementation plan
- `docs/market-analysis-2026-11.md`: competitors, positioning and the 90-day plan
