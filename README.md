# Nazar Vision — computer vision & robot perception website

Marketing site for a computer-vision firm, in English, Uzbek and Russian. It has 24 live in-browser demos (with sample videos), free downloadable source code for all of them (behind a free sign-up), a services section, 36 use cases and a licence-aware open-source library. The site shows no prices: every project is quoted after a free check.

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
| Brand name | `src/config/site.ts` |
| Email, Telegram, WhatsApp, booking link | Vercel env vars `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_TELEGRAM` (username or t.me link), `NEXT_PUBLIC_WHATSAPP` (number), `NEXT_PUBLIC_BOOK_CALL_URL`. A channel that isn't set is hidden; the floating Telegram button appears once `NEXT_PUBLIC_TELEGRAM` is set |
| All copy (EN / UZ / RU) | `messages/{en,uz,ru}.json`. `npm test` fails if a key is missing in one language |
| Industries, demos, services, use cases, sample videos | `src/lib/content.ts` |
| Open-source repo list | `scripts/catalog.mjs`, then `npm run repos:update` (uses `gh auth token` or `GITHUB_TOKEN`) |
| Colours and fonts | `src/app/globals.css` and `src/app/[locale]/layout.tsx` |

## Contact form

Every message is saved in the database and listed on the owner dashboard (`/admin`), where you can reply, mark it answered or delete it. With [Resend](https://resend.com) set up it is also emailed to you:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`: where inquiries go
- `CONTACT_FROM_EMAIL` (optional): a sender on your verified domain

With neither a database nor Resend, the form tells visitors to use Telegram or email instead. Each visitor can send 5 messages an hour (10 sign-up code requests, 30 code checks); the limit uses a salted hash of the IP, never the IP itself.

`/contact?need=pilot` (or `check`, `deploy`, …) opens the form with that option chosen.

## Demos

All demos run client-side. Models download on first use from Google (MediaPipe), Hugging Face (Transformers.js) and jsDelivr (Tesseract, ZXing). Images never leave the device.

Sample images are hot-linked from the public `Xenova/transformers.js-docs` dataset on Hugging Face. Replace them with your own photos in `src/lib/content.ts` before launch.

Sample videos live in `public/videos/` (about 28 MB, Pexels licence; sources in `public/videos/CREDITS.md`). The Uzbek car and plate photos in `public/samples/` are from Wikimedia Commons under CC BY-SA 4.0 (credits in `public/samples/CREDITS.md` and on the plate demo). They are served from the site itself because browsers block frame analysis on videos from other domains. Your own factory footage will sell better: drop MP4s in the same folder and update `videos` in `src/lib/content.ts`.

The PPE demo downloads OWLv2 (163 MB), "Ask about a photo" and the plate reader download Florence-2 (about 270 MB), and the defect check, fire/smoke and video search download CLIP ViT-B/32 (153 MB) on first use, so they wait for a click.

Every model has a licence that allows commercial use, shown on its demo page (`licence` in `src/lib/content.ts`). Apple's MobileCLIP was replaced by OpenAI CLIP because MobileCLIP's weights are licensed for research only.

The alert demos (safety zone, people counter, speed, plate reader, fire/smoke, fall, left-behind) keep an event log that downloads as CSV. Their rules are plain, tested code in `src/lib/demo/` (`plates.ts`, `fall.ts`, `leftBehind.ts`). Demos with small models (7 MB or less) start a sample video as soon as the page opens. Add `?sample=<key>` to a demo URL to open it on a given sample.

## Free source code and sign-up

`npm run build` first runs `scripts/build-code-kit.mjs`, which packages every demo into a standalone
Next.js project at `.code-kit/nazar-vision-demos.zip` (about 85 KB; it fetches the sample videos with
`npm run samples`). `/[locale]/code` shows a sign-up form; `/api/code` serves the zip to signed-in users
only and logs each download.

Sign-ups are stored in any Postgres database named by `DATABASE_URL` (Supabase, Neon, Vercel Postgres…).
The tables are created automatically on first use, in their own `nazar_vision` schema
(`signups` and `code_downloads`), so Supabase's public API never exposes them. Signing up sets a
signed, http-only cookie on that browser; there is no password and no email step.

To switch it on, add `DATABASE_URL` in Vercel → Settings → Environment Variables and redeploy.
For Supabase, use the **Session pooler** connection string (Connect → Session pooler,
`...pooler.supabase.com`), not the direct `db.<project>.supabase.co` one: the direct address is
IPv6-only and Vercel can't reach it. Put the real database password in it, URL-encoding any special
characters. Optional: `SESSION_SECRET` (otherwise derived from `DATABASE_URL`), and the Resend
variables from the contact form to get an email for each new sign-up.

People sign up or sign in at `/[locale]/code` or `/[locale]/account` (the "Sign in" link in the header
appears once the database is connected), in two ways:

- **Continue with Google.** Needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud →
  APIs & Services → Credentials → Create OAuth client ID (type "Web application"). Add
  `https://nazar-vision.vercel.app/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback`
  for local work) under Authorized redirect URIs. On the OAuth consent screen choose "External" and
  publish it, or only listed test users can sign in. Only Google accounts with a verified email are
  accepted. Set `GOOGLE_REDIRECT_ORIGIN` if previews should send people back to a fixed address.
- **Email.** Every address is checked first: format, a domain that can receive mail (MX lookup),
  about 120,000 known throwaway-inbox domains, and likely typos ("gmial.com" → "Did you mean
  gmail.com?"). When `RESEND_API_KEY` is set, a 6-digit code is emailed in the visitor's language
  (10 minutes, 5 tries, at most 6 codes a day per address, 45 s between sends) and the address is
  marked confirmed. Without it, people are signed in straight after the checks. Resend's test sender
  (`onboarding@resend.dev`) only delivers to your own Resend email: verify your domain in Resend and
  set `CONTACT_FROM_EMAIL` (e.g. `Nazar Vision <code@yourdomain.uz>`) before launch.

The same Resend settings send the contact form and an email to `CONTACT_TO_EMAIL` for each new sign-up.

## Owner dashboard and analytics

`/en/admin` (not linked anywhere, not indexed) shows visits, page views, demo runs by demo and by
how they were started (auto-start, scene link, sample, own webcam, own file), demo errors, sign-ups,
code downloads, contact messages, countries, referrers, devices and site language, for the last 7, 30
or 90 days. It also lists everyone who signed up (with Google or email, and whether the email is
confirmed), exports them as CSV, deletes a person, and has a
switch to pause new sign-ups. Contact-form messages appear there too.

People can delete their own account on the account page; `/privacy` and `/terms` describe what is
collected. Have both pages checked by a lawyer before relying on them (Uzbekistan's personal-data
law has rules on where citizens' data is stored).

Set `ADMIN_PASSWORD` in Vercel to open it (a long random string; changing it signs everyone out).
Analytics need `DATABASE_URL` too. Visits are counted without cookies: each visitor gets an anonymous
id that changes daily (a hash of IP, browser and date), IP addresses are never stored, and bots are
skipped. The standalone code download keeps a no-op `track()` so it sends nothing anywhere.
Until `DATABASE_URL` is set the code page says sign-up opens shortly and points to the contact form.

## Docs

- `docs/superpowers/specs/2026-11-24-cv-firm-site-design.md`: design
- `docs/superpowers/plans/2026-11-24-cv-firm-site.md`: implementation plan
- `docs/market-analysis-2026-11.md`: competitors, positioning and the 90-day plan
