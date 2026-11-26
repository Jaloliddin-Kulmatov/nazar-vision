# Nazar Vision Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, chosen by owner's "build it"). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Trilingual marketing site for a CV firm with 10 in-browser demos and a licence-aware open-source library.

**Architecture:** Next.js App Router with `[locale]` segment (next-intl). Static pages; demos are client components that lazy-load MediaPipe / Transformers.js / Tesseract.js / zxing-wasm. Library data is a JSON file generated from the GitHub API at build time. Contact is one route handler calling Resend.

**Tech Stack:** Next.js 16.4, React 19, TypeScript, Tailwind v4, next-intl 4.16, @mediapipe/tasks-vision 1.2.3, @huggingface/transformers 4.3.2, tesseract.js 7, zxing-wasm 3.1.7, vitest.

**Spec:** `docs/superpowers/specs/2026-11-24-cv-firm-site-design.md`

## Global Constraints
- Locales exactly `en`, `uz` (Latin), `ru`; default `en`; every message key exists in all three.
- Brand name, contacts, prices only in `src/config/site.ts`.
- No demo sends image data over the network; each demo shows "Images never leave your device".
- No fabricated testimonials/clients; scenarios labelled as examples.
- Do not use RMBG-1.4 or Ultralytics/AGPL weights in demos.

## Review Focus
1. Camera permission denied / no camera → demo shows a clear message and the photo-upload path still works.
2. Model download fails or is slow (mobile, offline) → visible loading progress and a retry, no blank canvas.
3. Very large uploaded photo (e.g. 6000×4000) → downscaled before inference; tab doesn't freeze.
4. Contact form with no RESEND_API_KEY set → 503 with message pointing to Telegram/email, not a crash.
5. Library filters combined with an empty result → "no repos match" state, filters resettable.

---

### Task 1: Scaffold, theme, i18n, layout shell
**Files:** create-next-app output; `src/i18n/{routing,request}.ts`, `src/middleware.ts` (proxy), `messages/{en,uz,ru}.json`, `src/config/site.ts`, `src/app/[locale]/layout.tsx`, `src/components/{Header,Footer,LangSwitch}.tsx`, `tests/messages.test.ts`
- [ ] Test `messages have identical key sets across en/uz/ru` (deep key flatten, `expect(keys(uz)).toEqual(keys(en))`).
- [ ] Implement; `npx vitest run` passes; `npm run build` passes. Commit.

### Task 2: Open-source library
**Files:** `scripts/fetch-repos.mjs`, `src/data/repos.json`, `src/data/repo-meta.ts` (task/category per repo), `src/lib/repos.ts`, `src/app/[locale]/open-source/page.tsx`, `src/components/RepoExplorer.tsx`, `tests/repos.test.ts`
- **Produces:** `type Repo = {name, url, stars, license, pushedAt, archived, description, task: Task}`; `isCommercialSafe(license: string): boolean` (true for MIT, Apache-2.0, BSD-*; false for AGPL/GPL/NONE/NOASSERTION); `filterRepos(repos, {q, task, commercialOnly, sort}) : Repo[]`; `isStale(pushedAt, now): boolean` (> 365 days).
- [ ] Tests: `isCommercialSafe('AGPL-3.0')===false`, `('Apache-2.0')===true`; `filterRepos` with `commercialOnly` drops ultralytics; q `"ocr"` matches PaddleOCR; impossible filter → `[]`; `isStale('2024-08-09', new Date('2026-11-24'))===true`.
- [ ] Implement, pass, commit.

### Task 3: Marketing pages
**Files:** `src/app/[locale]/{page,solutions/page,pricing/page,about/page,contact/page}.tsx`, `src/components/{Hero,IndustryGrid,ProcessSteps,PricingTable,ContactForm,CTA}.tsx`, `src/app/api/contact/route.ts`, `tests/contact.test.ts`
- **Produces:** `validateContact(body): {ok:true,data}|{ok:false,error}` (name, email, message required; email regex; message ≤ 5000).
- [ ] Tests: missing email → error; valid → ok; POST without RESEND_API_KEY → 503.
- [ ] Implement, pass, build, commit.

### Task 4: Demo infrastructure
**Files:** `src/components/demo/{DemoShell,MediaInput,ModelStatus}.tsx`, `src/lib/demo/{camera,image,mediapipe}.ts`, `src/lib/demos.ts`, `src/app/[locale]/demos/{page,[slug]/page}.tsx`, `tests/image.test.ts`
- **Produces:** `fitWithin(w,h,max): {w,h}`; `DemoShell` props `{slug, children}`; `MediaInput` emits `HTMLVideoElement | HTMLImageElement`; `getVision(): Promise<FilesetResolver>` cached; `demos: {slug, task, engine}[]` (10 slugs).
- [ ] Test `fitWithin(6000,4000,1280)` → `{w:1280,h:853}`; no upscaling for small images.
- [ ] Implement, pass, commit.

### Task 5: MediaPipe demos (object, counter, face-anonymize, pose, gestures)
**Files:** `src/components/demos/{ObjectDetection,PeopleCounter,FaceAnonymize,PoseDemo,GestureDemo}.tsx`, `src/lib/demo/linecross.ts`, `tests/linecross.test.ts`
- **Produces:** `sideOfLine(p, a, b): -1|0|1`; `class LineCounter { update(tracks: {id,x,y}[]): {in,out} }` with nearest-centroid tracking.
- [ ] Tests: point crossing left→right increments `in` once; jitter on the line doesn't double count.
- [ ] Implement, pass, commit.

### Task 6: Other demos (OCR, QR/barcode, background removal, zero-shot defect, depth)
**Files:** `src/components/demos/{OcrDemo,BarcodeDemo,BackgroundRemoval,DefectCheck,DepthDemo}.tsx`
- [ ] Implement; manual check in browser with sample images in `public/samples/`. Commit.

### Task 7: Verify & deploy
- [ ] `npm run build`, `npx vitest run` green; browser check every page × 3 locales, each demo (photo path) works, mobile width 375 has no horizontal scroll.
- [ ] Ask owner, then deploy preview to Vercel.
