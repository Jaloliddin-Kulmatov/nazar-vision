# Nazar Vision — computer vision & robot perception website

Marketing site for a computer-vision firm, in English, Uzbek and Russian. It has 19 live in-browser demos (with sample videos), free downloadable source code for all of them (behind a free sign-up), a services section, 36 use cases and a licence-aware open-source library. The site shows no prices: every project is quoted after a free check.

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
| Brand name, email, Telegram, WhatsApp, booking link | `src/config/site.ts` |
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

The PPE demo downloads OWLv2 (163 MB) and "Ask about a photo" downloads Florence-2 (about 270 MB) on first use, so they wait for a click. Demos with small models (7 MB or less) start a sample video as soon as the page opens. Add `?sample=<key>` to a demo URL to open it on a given sample.

## Free source code and sign-up

`npm run build` first runs `scripts/build-code-kit.mjs`, which packages every demo into a standalone
Next.js project at `.code-kit/nazar-vision-demos.zip` (about 85 KB; it fetches the sample videos with
`npm run samples`). `/[locale]/code` shows a sign-up form; `/api/code` serves the zip to signed-in users
only and logs each download.

Accounts use Supabase email sign-in links. To switch them on:

1. In your Supabase project, run `supabase/schema.sql` in the SQL editor (profiles and downloads tables,
   row-level security, and a trigger that copies name and company from the sign-up form).
2. In Authentication → URL configuration, set the Site URL to `https://nazar-vision.vercel.app` and add
   `https://nazar-vision.vercel.app/**` and `http://localhost:3000/**` to the redirect URLs.
3. In Vercel (and `.env.local` for local work) set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the anon key also works), then redeploy.
4. Supabase's built-in email sender only allows a few emails an hour. Before launch, add your own SMTP
   (for example Resend) in Authentication → SMTP settings.

Until step 3 is done the code page says sign-up opens shortly and points to the contact form.

## Docs

- `docs/superpowers/specs/2026-11-24-cv-firm-site-design.md`: design
- `docs/superpowers/plans/2026-11-24-cv-firm-site.md`: implementation plan
- `docs/market-analysis-2026-11.md`: competitors, positioning and the 90-day plan
