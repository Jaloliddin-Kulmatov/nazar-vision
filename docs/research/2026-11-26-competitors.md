# Competitor research and gaps — 26 Nov 2026

What other computer-vision companies offer, where they fall short, and what Nazar Vision can add to fill those gaps. Observations are from the companies' public websites on 26 Nov 2026.

## Local competitors (Uzbekistan)

| Company | What they sell | Strong points | Gaps we saw |
|---|---|---|---|
| **Cradle Vision** (cradle-vision.com) | Footfall, queues, work time, safety alerts on existing IP cameras. Backed by IT Park Ventures, NVIDIA Inception | Clear products, "pilot in days", Telegram bot, recorded demo video | No way to try it yourself; the contact form said "temporarily unavailable"; no public prices |
| **CAMVI** (camvi.uz) | Visitor counting + staff attendance, 650,000 UZS / camera / month, camera included | Transparent price, pricing calculator, real retail clients | Only two use cases; the interactive example is sample data, not a working model; subscription lock-in |
| **Innosoft** (innosoft.uz) | Custom CV development from 5 mln UZS, 2–4 weeks | Clear price floor, long explanatory page, Telegram alerts | General IT agency; no demos; text-only |
| **DeepView** (deepview.solutions) | Video management with AI detections, HR hiring bot, agro, KYC | Own live products, VLM/LLM skills | Spread across many unrelated areas; no try-it demos; screenshots only |
| **OnVision** (onvision.uz) | Video analytics for manufacturing, retail, HoReCa | — | Site failed to load in a browser because of an untrusted security certificate |
| **OneDev** (onedev.uz) | Software studio, writes guides on video analytics in Uzbekistan | Good content marketing; says **licence-plate recognition is the most requested task** locally | No product to try |

## Global players

| Company | Gap |
|---|---|
| Roboflow, Landing AI, Clarifai, Viso | Built for developers; enterprise pricing; free tiers make datasets public; English only |
| Intenseye, Protex AI, Voxel (safety) | Enterprise-only, sales call before anything; cloud subscription; not present in Central Asia |
| Ultralytics YOLO | Most popular models are **AGPL-3.0**: shipping them inside a closed product needs a paid licence. Many local integrators use them anyway |

Common complaints across the market: **false alarms**, **vendor lock-in** (closed cloud, subscription per camera), **video leaving the site**, **no way to try before a sales call**.

## Where Nazar Vision already wins

- 19 demos that run in the visitor's browser: nothing is uploaded, and every one can be tried with no call.
- English, Uzbek and Russian.
- Free source code; models with commercial-safe licences (Apache/MIT).

## Gaps to fill (proposal)

### New demos (all in the browser, reusing models we already load)

1. **Licence-plate reader for Uzbek plates.** Florence-2 finds the plate and reads it, then the text is checked against Uzbek formats (`01 A 123 BC`, `01 123 ABC`). This is the most-requested local task, and no local competitor lets you try it. Repos: `PaddlePaddle/PaddleOCR`, `openalpr/openalpr` (ideas only, AGPL).
2. **Fire and smoke alert.** OWLv2 looks for "fire" and "smoke" and raises an alert only after several frames in a row agree. That answers the false-alarm complaint, and a sensitivity slider shows the trade-off. Repos: `gaia-solutions-on-demand/DFireDataset`.
3. **Fall detection.** The existing pose model plus a rule: the body turns horizontal and the hips drop fast. For elderly care, factories and warehouses. Repo: `taufeeque9/HumanFallDetection`.
4. **Search video in plain words.** Type "person in a red jacket" or "truck at the gate", and MobileCLIP scores sampled frames and jumps to the best moments. This answers "nobody watches hours of footage". Repos: `mlfoundations/open_clip`, NVIDIA video-search-and-summarization.
5. **Left-behind object.** The detector plus our tracker flags an object that stays still with no person near it for N seconds. Repo: `roboflow/supervision`.

### Site features

6. **"Why Nazar" comparison** on the home and services pages: try before talking, video stays on your device, no per-camera subscription, you own the code and model, commercial-safe licences (no AGPL surprises), honest accuracy figures. Also a licence badge on each demo.
7. **14-day pilot offer**: what happens each day, what the client provides, the go/no-go at the end. Free, with no prices, as agreed earlier.
8. **Event log with CSV export** on the counting and safety demos ("reports, not hours of footage").
9. **Telegram contact button** in the header, footer and contact page. Telegram is the main channel in Uzbekistan.
10. **Privacy policy, terms and account deletion**, plus **per-IP limits** on sign-up codes and the contact form.
