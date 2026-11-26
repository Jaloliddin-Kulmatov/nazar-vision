"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { EventLog, useEventLog } from "@/components/demo/EventLog";
import { useModel } from "@/lib/demo/useModel";
import { mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox } from "@/lib/demo/image";
import { CentroidTracker, SpeedTrap, type Pt } from "@/lib/demo/tracker";
import { videos } from "@/lib/content";

const VEHICLES = ["car", "truck", "bus", "motorcycle", "bicycle"];
const loadVehicles = mediapipeDetector({ allow: VEHICLES, minScore: 0.3 });

/** Two lines across the lanes in the traffic sample. Click four points to move them. */
const DEFAULT_A: [Pt, Pt] = [
  { x: 0.25, y: 0.9 },
  { x: 1, y: 0.9 },
];
const DEFAULT_B: [Pt, Pt] = [
  { x: 0.35, y: 0.7 },
  { x: 1, y: 0.7 },
];

function drawLines(ctx: CanvasRenderingContext2D, a: [Pt, Pt], b: [Pt, Pt], meters: number, draft: Pt[]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const s = Math.max(1, w / 900);
  ctx.save();
  ctx.lineWidth = 3 * s;
  ctx.setLineDash([12 * s, 8 * s]);
  ctx.font = `700 ${14 * s}px ui-monospace, monospace`;
  [a, b].forEach(([p, q], i) => {
    ctx.strokeStyle = "#6cb6ff";
    ctx.beginPath();
    ctx.moveTo(p.x * w, p.y * h);
    ctx.lineTo(q.x * w, q.y * h);
    ctx.stroke();
    ctx.fillStyle = "#6cb6ff";
    ctx.fillText(i === 0 ? "A" : "B", p.x * w + 8 * s, p.y * h - 8 * s);
  });
  ctx.setLineDash([]);
  ctx.fillStyle = "#6cb6ff";
  ctx.fillText(`${meters} m`, ((a[0].x + b[0].x) / 2) * w + 8 * s, ((a[0].y + b[0].y) / 2) * h);
  ctx.fillStyle = "#ffc629";
  for (const p of draft) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export default function VehicleSpeedDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadVehicles);
  const tracker = useRef(new CentroidTracker(0.12, 10));
  const trap = useRef(new SpeedTrap(DEFAULT_A, DEFAULT_B, 8));
  const [meters, setMeters] = useState(8);
  const [limit, setLimit] = useState(40);
  const [lines, setLines] = useState<{ a: [Pt, Pt]; b: [Pt, Pt] }>({ a: DEFAULT_A, b: DEFAULT_B });
  const [draft, setDraft] = useState<Pt[]>([]);
  const [log, setLog] = useState<number[]>([]);
  const events = useEventLog();
  const last = useRef(0);
  const lastClock = useRef(0);

  const reset = () => {
    tracker.current.reset();
    trap.current.reset();
    setLog([]);
  };

  /** Vehicles are followed at the middle of their lower edge: where the wheels meet the road. */
  const anchors = (dets: Det[], w: number, h: number) => dets.map((d) => ({ x: (d.x + d.w / 2) / w, y: (d.y + d.h * 0.95) / h }));

  const over = log.filter((v) => v > limit).length;
  const avg = log.length ? log.reduce((a, b) => a + b, 0) / log.length : 0;

  return (
    <DemoStage
      webcam
      size="7 MB"
      model={model}
      samples={[{ key: "trafficVideo", url: videos.traffic, kind: "video" }]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onSourceChange={() => reset()}
      onVideoFrame={(video, ctx, now) => {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const dets = model.get()!.detectFrame(video, now);
        // Use the video's own clock so pausing or slow frames don't distort the speed.
        const clock = video.currentTime * 1000;
        if (clock < lastClock.current - 500) {
          // The clip looped: same cars again, new IDs.
          tracker.current.reset();
          trap.current.forgetTracks();
        }
        lastClock.current = clock;
        trap.current.lineA = lines.a;
        trap.current.lineB = lines.b;
        trap.current.meters = meters;
        const tracks = tracker.current.update(anchors(dets, w, h), clock);
        trap.current.update(tracks, clock);
        drawLines(ctx, lines.a, lines.b, meters, draft);
        for (const tr of tracks) {
          if (tr.det < 0) continue;
          const d = dets[tr.det];
          const kmh = trap.current.speeds.get(tr.id);
          const label = kmh === undefined ? d.name : `${Math.round(kmh)} km/h`;
          drawBox(ctx, d.x, d.y, d.w, d.h, label, kmh === undefined ? "#a5b3c8" : kmh > limit ? "#ff5d6c" : "#3ee0a0");
        }
        if (now - last.current > 300) {
          last.current = now;
          const all = trap.current.log;
          if (all.length !== log.length) {
            for (const v of all.slice(log.length)) events.add(t("evSpeed"), `${Math.round(v)} km/h`, v > limit ? "alert" : "info");
            setLog([...all]);
          }
        }
      }}
      onImage={async (input, ctx) => {
        const dets = await model.get()!.detectImage(input);
        drawLines(ctx, lines.a, lines.b, meters, draft);
        for (const d of dets) drawBox(ctx, d.x, d.y, d.w, d.h, d.name, "#a5b3c8");
      }}
      rerunKey={`${meters}-${draft.length}-${JSON.stringify(lines)}`}
      onCanvasClick={(p) => {
        const next = [...draft, p];
        if (next.length < 4) return setDraft(next);
        setLines({ a: [next[0], next[1]], b: [next[2], next[3]] });
        setDraft([]);
        reset();
      }}
    >
      <Panel title={t("results")}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [t("speedMeasured"), log.length, "text-cyan"],
            [t("speedAverage"), log.length ? `${Math.round(avg)}` : "—", "text-cyan"],
            [t("speedOver"), over, over ? "text-danger" : "text-lime"],
          ].map(([label, v, color]) => (
            <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className={`tabular font-display text-xl font-bold ${color}`}>{v}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        {log.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("speedLog")}>
            {log.slice(-12).map((v, i) => (
              <li key={i} className={`tabular rounded-md px-2 py-1 text-xs font-semibold ${v > limit ? "bg-danger/15 text-danger" : "bg-lime/10 text-lime"}`}>
                {Math.round(v)} km/h
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-text"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> {t("resetCount")}
        </button>
      </Panel>
      <Panel title={t("speedSetup")}>
        <label className="block text-sm">
          <span className="flex justify-between text-muted">
            {t("speedDistance")} <span className="tabular text-text">{meters} m</span>
          </span>
          <input type="range" min={2} max={40} step={1} value={meters} onChange={(e) => { setMeters(Number(e.target.value)); reset(); }} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm">
          <span className="flex justify-between text-muted">
            {t("speedLimit")} <span className="tabular text-text">{limit} km/h</span>
          </span>
          <input type="range" min={10} max={120} step={5} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <p className="mt-3 text-sm text-muted">{t("speedDraw")}</p>
        <p className="mt-2 text-xs text-dim">{t("speedNote")}</p>
      </Panel>
      <EventLog events={events.events} onClear={events.clear} name="vehicle-speed" />
    </DemoStage>
  );
}
