# Nazar Vision — CV firm website · Design

Approved by the owner on 2026-11-24.

## Intent
Marketing site for a computer-vision firm that builds CV applications for businesses. The goal is **winning real clients**: B2B buyers in Uzbekistan / Central Asia and abroad should understand what the firm does, try it live, trust it, and get in touch.

## Goals
- Visitors can **try working CV demos** instantly (webcam or photo), with no sign-up and no upload to a server.
- A searchable **open-source CV library** that shows the firm knows the field (license-aware).
- Clear industries/solutions, process, pricing packages, and multiple contact paths.
- Trilingual: English, Uzbek (Latin), Russian.

## Non-goals
- No backend inference, user accounts, or CMS in v1.
- No real client logos, testimonials, or case studies (there aren't any yet).

## Anti-goals
- Fabricated testimonials or clients presented as real.
- Demos that silently upload images (privacy is a selling point).
- Recommending AGPL / non-commercial models without flagging the licence.

## Constraints
- Next.js 16 (App Router) + TypeScript + Tailwind, hosted on Vercel.
- All demo inference runs client-side; models load from CDN / Hugging Face on demand (lazy).
- Brand is a placeholder ("Nazar Vision"); name, contacts, and prices live in one config file.

## Approaches considered (demo engine)
1. **MediaPipe Tasks Vision (realtime) + Transformers.js (heavier photo models)** — *chosen.* Maintained, GPU-accelerated, Apache/MIT licences, small models for webcam work.
2. YOLO via onnxruntime-web for everything — strongest detector, but Ultralytics weights are AGPL-3.0; bad example for a firm selling closed apps.
3. TF.js COCO-SSD / MobileNet — simple, but unmaintained since 2023.

## Decided design
- **Look:** dark, futuristic; neon cyan/lime accents, grid, scan lines, bounding-box motifs.
- **i18n:** `next-intl`, routes `/en`, `/uz`, `/ru`, language switcher; default `en`.
- **Pages:** Home · Solutions (8 industries) · Demo Lab (index + one page per demo) · Open-Source Library · Pricing · About/Process · Contact.
- **Demos (10):**
  1. Object detection — MediaPipe EfficientDet-Lite0, webcam realtime + photo.
  2. Zone people counter — detection + user-drawn line/zone, in/out counts.
  3. Face detection + **anonymize** (blur) — MediaPipe Face Detector.
  4. Pose estimation — MediaPipe Pose Landmarker.
  5. Hand gestures — MediaPipe Gesture Recognizer.
  6. OCR — Tesseract.js, eng / uzb / rus.
  7. QR & barcode — zxing-wasm, photo + webcam.
  8. Background removal — Transformers.js BiRefNet-lite (MIT); *not* RMBG-1.4 (non-commercial).
  9. Zero-shot defect / quality check — CLIP, user-typed labels.
  10. Depth map — Depth-Anything-V2-small.
- **Library:** ~65 repos, in `data/repos.json` built from the GitHub API by `scripts/fetch-repos.mjs` (stars, licence, last push, archived). Filters: task, licence, "commercial-safe", search, sort. Flags: AGPL/GPL, non-commercial, archived/stale.
- **Pricing:** Pilot · Deployment · Enterprise, placeholder "from $X".
- **Contact:** form → `/api/contact` → Resend (falls back to a "not configured" message + direct links if no key); Cal.com link; Telegram & WhatsApp buttons.
- **Honesty:** "Images never leave your device" on every demo; scenarios labeled as examples.

## Left to the builder
Exact copy, iconography, animation details, layout of each page, model-loading UX, mobile layout.

## Builder's calls (made without asking, easy to change)
- Placeholder contacts: `hello@example.com`, `t.me/your_handle`, WhatsApp placeholder, `cal.com/your-link`.
- Prices: Pilot from $1,500 · Deployment from $6,000 · Enterprise custom.
- Healthcare is framed as operations (PPE, occupancy, document OCR), not diagnosis.
