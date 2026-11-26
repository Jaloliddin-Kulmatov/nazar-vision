# Market analysis & strategy: computer vision + robotics firm (Central Asia)

Researched 2026-11-24 from competitors' own websites and published market reports. Market-size figures vary a lot between research firms, so they're given as ranges with their source.

## 1. Market size

| Segment | 2026 size | Growth | Source |
|---|---|---|---|
| Computer vision (global) | $20.5B – $28.2B | 11–20% CAGR | Research&Markets, Grand View Research (Asia-Pacific = 42% of revenue in 2025) |
| Machine vision + vision-guided robotics | $16.7B – $25.5B | ~9–10% CAGR | Intel Market Research, Global Growth Insights |
| Vision-guided robotics only (narrow definition) | $4.7B | 9.3% CAGR to 2034 | Intel Market Research |
| Bin-picking vision software | $420M | 12.6% CAGR to 2036 | Future Market Insights |

**Local signals.** In Uzbekistan, the government is putting about $3M into an Industrial AI Center of Excellence that will evaluate NVIDIA tech for digital twins and robotics, with launch expected in 2026 (gov.uz). IT Park has also signed an MoU with the Light Industry Development Agency, which covers textiles. Both point to factory-floor demand, not just retail analytics.

## 2. Competitors

### a) Local: Uzbekistan
| Company | What they sell | Price signal | Strengths | Gaps we can use |
|---|---|---|---|---|
| **Cradle Vision** (Tashkent, 2023) | Video-analytics product: footfall, queues, face-based work-time tracking, safety, education | Demo on request | Investors (IT Park Ventures $110k, AloqaVentures), NVIDIA Inception, Plug and Play; "pilot in days"; Central Asia + MENA plan | Packaged SaaS: no custom models, no manufacturing QC depth, no robotics. Contact form was offline when checked. |
| **CAMVI** (Tashkent) | Camera + subscription: customer analytics, attendance, HR/payroll workflows | 650,000 UZS per camera per month; free camera with a 12-month plan | Clear pricing, hardware included, UZ + US presence | Retail/HR only, no custom or industrial work |
| **Innosoft** (agency) | Custom CV as one of many software services | From 5M UZS, 2–4 weeks | Low entry price, on-premise option, long SEO-friendly explainer pages | Generalist; their main CV reference is one face-attendance project |
| **QWX Systems** (Feb 2026) | Number-plate recognition and CV deployments | — | ANPR focus | Very young, narrow |
| OneDev, PointAI | Blogs and small teams | — | — | — |

### b) Regional: Kazakhstan (Russian-language competition)
| Company | Offer | Price signal |
|---|---|---|
| **A-LUX** (Almaty, 19-year digital agency) | Custom CV: counting, PPE, zones, number plates; exports to 1C, Telegram, WhatsApp | Pilot on 1 camera from 1,500,000 ₸, from 4 weeks, 12-month warranty, claims 90–98% accuracy |
| **AidarDev** | Custom CV; "start with a pilot on one camera" | — |
| **AST IT Garant** | Local-server video analytics, packaged and custom | — |
| **DataMind**, **Q-Data (Kepler Vision)** | Retail heatmaps and queues; safety analytics | — |

### c) Global CV development agencies
Oxagile, ValueCoders, Ksolves, Signity, Xicom, Phaedra, Entrans. They have long service-list pages, Clutch reviews and "Top 10" listicles, and **almost none have live demos**. They compete on trust signals and portfolio size, not on proof.

### d) Global platforms (tools and partners more than competitors)
**Roboflow** (80k+ organizations; open-source supervision, rf-detr and inference), Landing AI, Ultralytics. Their sites set the visual bar: industries named by outcome, a pipeline diagram, two paths ("build yourself" vs "talk to an expert"), and open-source repos with star counts.

### e) Robot vision
- **3D vision and bin-picking vendors:** Mech-Mind, Photoneo (Zebra), Pickit (18 robot brands), Eureka Robotics, Apera AI, Solomon, Zivid (camera only), Keyence, SICK. **Tactic worth copying:** Eureka offers a *free feasibility check*: send parts, get a video of the result.
- **Robot makers:** FANUC iRVision, Yaskawa MotoSight. These lock you to one robot brand.
- **Perception integrators** (e.g. YantriX, PickNik, Andersen): deliver ROS 2 perception packages, accuracy/latency benchmarks, camera and lighting specs, datasets and retraining instructions. **This is the closest model for us in robotics.**

## 3. Where we can win

1. **Proof before the sales call.** None of the local or regional sites we reviewed lets a visitor try a real model. Our 10 in-browser demos are a unique trust signal while we have no client logos.
2. **Industrial and robotics depth.** Local players sell retail and HR analytics. Nobody offers robot perception (3D vision, pick-and-place, ROS 2), which is exactly where the government's NVIDIA Industrial AI centre is pointing.
3. **Textile and light industry.** Uzbekistan's biggest manufacturing cluster. Fabric defect detection, garment QC, cotton and yarn grading, and needle/PPE safety are concrete and underserved.
4. **Licence honesty.** Competitors build on Ultralytics YOLO (AGPL-3.0) without saying so. We flag licences and ship models clients can own.
5. **Three languages.** EN for export and international clients, RU for Kazakhstan and older managers, UZ for local SMEs.

## 4. Where we're weaker (and the fix)

| Weakness | Fix |
|---|---|
| No clients, logos or backers | Apply to IT Park residency and NVIDIA Inception (both free) and show the badges. Run 2–3 discounted pilots and turn them into case studies. |
| Pilot price ($1,500) is above local agencies (Innosoft from 5M UZS, A-LUX from 1.5M ₸) | Add a **free feasibility check** (images/videos in, written report in 5 business days), show prices in UZS, and keep the paid pilot positioned as "measured accuracy on your data". |
| Placeholder name "Nazar Vision" is used by an NYC photographer and an eye-care shop | Pick the final name and check uz/kz domains and trademarks before launch. |
| No robotics hardware references | Partner with one 3D-camera vendor (Luxonis OAK-D, Intel RealSense or Orbbec are affordable). Build an in-house demo cell (cobot or low-cost arm, OAK-D, Jetson Orin) and film it. |

## 5. Positioning

> **A computer vision & robot-perception engineering studio for Central Asian industry.**
> We build custom vision systems that inspect, count and guide robots, and we prove they work on your data before you buy.

Lead with manufacturing QC, textiles, logistics and robotics. Keep retail/security as secondary (that's Cradle's and CAMVI's home turf).

## 6. Website plan

**Done in this build:** live in-browser demos, an open-source library with licence checks, EN/UZ/RU, industries by outcome, pipeline diagram, two-path CTA, FAQ, pricing, contact via form/Telegram/WhatsApp/call.

**Added after this analysis:**
- A Robotics industry and a **Robot vision & perception** service (ROS 2 perception, 3D cameras, hand-eye calibration, bin-picking feasibility).
- A **Textile & light industry** solution.
- A **free feasibility check** as the entry offer on Pricing.
- Robotics repos in the library (ROS 2, MoveIt 2, Open3D, PCL, librealsense, DepthAI, LeRobot, OpenVLA, MuJoCo, Isaac Lab…).

**Next (recommended):**
1. Robotics demos: AprilTag/ArUco marker pose (robot calibration) and a depth → 3D point-cloud viewer.
2. One case-study page template (problem → setup photo → metric before/after), filled as soon as the first pilot ends.
3. SEO content in RU/UZ around the queries competitors rank for ("компьютерное зрение для бизнеса", "видеоаналитика Узбекистан", "kompyuter ko‘rish"). Innosoft and A-LUX win with long explainer pages.
4. Kazakh (kk) as a 4th language once there is a Kazakhstan client.
5. Partner and backer badges once obtained; a Clutch profile.
6. Wire up the Resend key, Cal.com link and Telegram bot for leads; add privacy-friendly analytics.

## 7. 90-day go-to-market

| Weeks | Action | Target |
|---|---|---|
| 1–2 | Final name and domain; IT Park residency and NVIDIA Inception applications; launch site | Site live |
| 2–6 | Outreach to 30 textile and food factories in Tashkent, Namangan, Fergana, Andijan with the free feasibility check | 10 feasibility checks |
| 4–8 | Build robot demo cell; film pick-and-place with 3D camera | 1 robotics video |
| 6–12 | Convert 2–3 feasibility checks into paid pilots; publish first case study | 2 paid pilots |
| ongoing | 2 RU/UZ articles per month; post demo clips on Telegram/LinkedIn | Inbound leads |

## Sources
- grandviewresearch.com/industry-analysis/computer-vision-market
- researchandmarkets.com/reports/5790756/computer-vision-market-report
- intelmarketresearch.com/machine-vision-vision-guided-robotics-market-43470
- globalgrowthinsights.com/market-reports/machine-vision-and-vision-guided-robotics-market-100480
- futuremarketinsights.com/reports/robot-guided-bin-picking-vision-software-market
- eurekarobotics.com/blog/bin-picking-buyers-guide
- yantrixtechnologies.com/services/computer-vision-robotics
- cradle-vision.com · camvi.uz/en/company · innosoft.uz/en/services/computer-vision
- a-lux.kz/kompyuternoe-zrenie · aidardev.kz · ast-it.kz · data-mind.kz · q-data.kz
- gov.uz/en/digital/news/view/100713 (Industrial AI Center of Excellence with NVIDIA)
- roboflow.com · telusdigital.com (data annotation services) · processpneumatics.com (Cognex distributor)

---

## Addendum (26 Nov 2026): how to package and sell the services

### What buyers are quoted elsewhere

| Item | Typical 2026 range | Source |
|---|---|---|
| Discovery sprint or proof of concept | $10K–35K | gmware, "Computer Vision Development: Cost, Timeline, What Breaks" |
| Single use-case MVP | $35K–120K | same |
| Production system with integrations and monitoring | $120K–350K+ | same |
| Consulting PoC (agency average) | $25K–75K | appinventiv, "How to Hire Computer Vision Consulting Partners" |
| All-in-one AI inspection camera (Overview.ai OV10i / OV20i / OV80i) | $4,450 / $9,450 / $13,450 per unit, list | hokai.io review of Overview's shop, 13 Nov 2026 |

Our placeholder prices (pilot from $1,500, deployment from $6,000, care from $150/month) sit far below Western agency rates and slightly above local agency entry prices (Innosoft from 5M UZS). That suits a regional studio. Raise them once there are 2–3 reference clients.

### What makes a pilot sellable

From gmware's "AI Proof of Concept Services: Contract for an Answer" (Oct 2026), adapted for vision:

- **One claim, written down first:** the question, the camera and what counts as a defect, with pass and stop thresholds.
- **A frozen evaluation set from the client's site:** built before tuning, so the score can't be gamed.
- **A baseline:** the current inspector, rule or manual count, measured on the same cases.
- **Failed cases as a deliverable:** grouped by cause.
- **Speed and cost measured on the target hardware.**
- **A production-gap list and a decision memo:** the outcome is deploy, narrow the scope, fix a prerequisite first, or stop.
- **Everything is client-owned.**

The site's Services page now promises exactly this pack ("A pilot that ends in a decision, not a demo").

### Why projects fail (used on the site as the "Honest engineering" section)

- **Lab vs floor:** 98% in the lab becomes 70% on the floor because of light, angle and clutter. The fix is collecting test data on site, across shifts.
- **Data is the budget:** labelling 100k images at about $1 each costs $100k. Quote labelling up front and use AI-assisted annotation.
- **The scene is cheaper to fix than the model:** camera position, lens and lighting.
- **Cost of a wrong answer:** for safety and quality decisions, keep a human in the loop.
- **Licences:** avoid AGPL models in closed products. This ties to the site's open-source library.

### Sales mechanics added to the site

1. **Offer ladder** on the home, services and use-cases pages: Free check (5 days) → Pilot (2–4 weeks) → Deployment (4–10 weeks) → Care plan (monthly).
2. **ROI calculator:** labour freed plus misses prevented, minus the care plan, giving payback months. It's on the services page and linked from pricing.
3. **Project brief form:** need, cameras or lines, timeline and budget range, so the first call is qualified.
4. **36 use cases:** each with problem, approach, KPI, effort tag and a demo link. More than half are manufacturing, textile, robotics or logistics.
5. **Hardware stance:** reuse the client's IP cameras plus a ~$250–600 edge computer. This is set against the $4.5–13.5k smart-camera price.

### Next moves

- **First case study:** run a free check plus a discounted pilot for one textile or food plant in Tashkent or Namangan, and publish the results (with permission) using the pilot pack format.
- **Own demo footage:** shoot your own factory footage. Pexels clips work as samples, but real Uzbek factory video sells better.
- **Pricing in UZS:** add a UZS display alongside USD once the pricing is set.
