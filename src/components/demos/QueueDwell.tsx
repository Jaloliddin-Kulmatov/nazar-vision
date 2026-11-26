"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox } from "@/lib/demo/image";
import { CentroidTracker, DwellMonitor, type Pt } from "@/lib/demo/tracker";
import { pointInPolygon } from "@/lib/demo/zone";
import { videos } from "@/lib/content";

const loadPeople = mediapipeDetector({ allow: ["person"], minScore: 0.35 });

/** The walkway in the street sample; four clicks draw a new area (a till queue, a counter, a door). */
const DEFAULT_ZONE: Pt[] = [
  { x: 0.3, y: 0.55 },
  { x: 0.75, y: 0.55 },
  { x: 0.88, y: 0.99 },
  { x: 0.18, y: 0.99 },
];

const secs = (ms: number) => `${Math.round(ms / 1000)} s`;

function drawZone(ctx: CanvasRenderingContext2D, zone: Pt[], busy: boolean, draft: Pt[]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const s = Math.max(1, w / 900);
  ctx.save();
  ctx.beginPath();
  zone.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)));
  ctx.closePath();
  ctx.fillStyle = busy ? "rgba(255,159,67,0.26)" : "rgba(108,182,255,0.16)";
  ctx.fill();
  ctx.lineWidth = 3 * s;
  ctx.setLineDash([12 * s, 8 * s]);
  ctx.strokeStyle = busy ? "#ff9f43" : "#6cb6ff";
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffc629";
  for (const p of draft) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export default function QueueDwellDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadPeople);
  const tracker = useRef(new CentroidTracker(0.1, 12));
  const dwell = useRef(new DwellMonitor(DEFAULT_ZONE));
  const [zone, setZone] = useState<Pt[]>(DEFAULT_ZONE);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [limit, setLimit] = useState(4);
  const [stats, setStats] = useState({ inZone: 0, longest: 0, average: 0, visits: 0 });
  const last = useRef(0);

  const reset = () => {
    tracker.current.reset();
    dwell.current.reset();
    setStats({ inZone: 0, longest: 0, average: 0, visits: 0 });
  };

  const feetOf = (dets: Det[], w: number, h: number) => dets.map((d) => ({ x: (d.x + d.w / 2) / w, y: (d.y + d.h * 0.95) / h }));

  const busy = stats.inZone >= limit;

  return (
    <DemoStage
      webcam
      size="7 MB"
      model={model}
      samples={[
        { key: "crowdVideo", url: videos.crowd, kind: "video" },
        { key: "warehouseVideo", url: videos.warehouse, kind: "video" },
        { key: "workersVideo", url: videos.workers, kind: "video" },
      ]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onSourceChange={() => reset()}
      onVideoFrame={(video, ctx, now) => {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const dets = model.get()!.detectFrame(video, now);
        const tracks = tracker.current.update(feetOf(dets, w, h), now);
        dwell.current.zone = zone;
        dwell.current.update(tracks, now);
        const st = dwell.current.stats;
        drawZone(ctx, zone, st.inZone >= limit, draft);
        for (const tr of tracks) {
          if (tr.det < 0) continue;
          const d = dets[tr.det];
          const ms = dwell.current.current.get(tr.id);
          const inside = ms !== undefined && pointInPolygon(tr, zone);
          drawBox(ctx, d.x, d.y, d.w, d.h, inside ? `${secs(ms)}` : `#${tr.id}`, inside ? (ms > 10000 ? "#ff9f43" : "#ffc629") : "#a5b3c8");
        }
        if (now - last.current > 250) {
          last.current = now;
          setStats(st);
        }
      }}
      onImage={async (input, ctx) => {
        const dets = await model.get()!.detectImage(input);
        const feet = feetOf(dets, ctx.canvas.width, ctx.canvas.height);
        const inZone = feet.filter((p) => pointInPolygon(p, zone)).length;
        drawZone(ctx, zone, inZone >= limit, draft);
        dets.forEach((d, i) => drawBox(ctx, d.x, d.y, d.w, d.h, "person", pointInPolygon(feet[i], zone) ? "#ffc629" : "#a5b3c8"));
        setStats({ inZone, longest: 0, average: 0, visits: 0 });
      }}
      rerunKey={`${zone.map((p) => `${p.x},${p.y}`).join(";")}-${draft.length}-${limit}`}
      onCanvasClick={(p) => {
        const next = [...draft, p];
        if (next.length < 4) return setDraft(next);
        setZone(next);
        setDraft([]);
        reset();
      }}
    >
      <Panel title={t("queueStatus")}>
        <div
          role="status"
          className={`rounded-xl border p-3 font-semibold ${busy ? "border-amber bg-amber/10 text-amber" : "border-lime/40 bg-lime/5 text-lime"}`}
        >
          {busy ? t("queueBusy", { n: stats.inZone }) : t("queueOk")}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          {[
            [t("queueNow"), stats.inZone],
            [t("queueLongest"), secs(stats.longest)],
            [t("queueAverage"), secs(stats.average)],
            [t("queueVisits"), stats.visits],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className="tabular font-display text-xl font-bold text-cyan">{v}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={t("queueArea")}>
        <label className="block text-sm">
          <span className="flex justify-between text-muted">
            {t("queueLimit")} <span className="tabular text-text">{limit}</span>
          </span>
          <input type="range" min={1} max={10} step={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <p className="mt-3 text-sm text-muted">{t("queueDraw")}</p>
        <button
          type="button"
          onClick={() => {
            setZone(DEFAULT_ZONE);
            setDraft([]);
            reset();
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-text"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> {t("zoneReset")}
        </button>
      </Panel>
    </DemoStage>
  );
}
