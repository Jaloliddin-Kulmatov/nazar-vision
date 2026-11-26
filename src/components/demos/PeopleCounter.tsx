"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, ArrowRightLeft } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox } from "@/lib/demo/image";
import { LineCounter, type Pt } from "@/lib/demo/linecross";
import { samples, videos } from "@/lib/content";

/** Classes the counter can follow. People are tracked at the feet, everything else at the centre. */
const COUNT_CLASSES = ["person", "car", "truck", "bus", "bicycle", "motorcycle", "bottle"] as const;
type CountClass = (typeof COUNT_CLASSES)[number];
const loadCounterDetector = mediapipeDetector({ allow: [...COUNT_CLASSES], minScore: 0.3 });

const DEFAULT_A: Pt = { x: 0.5, y: 0.95 };
const DEFAULT_B: Pt = { x: 0.5, y: 0.05 };

function drawLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, labels: [string, string]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const s = Math.max(1, w / 900);
  ctx.save();
  ctx.strokeStyle = "#6cb6ff";
  ctx.lineWidth = 3 * s;
  ctx.setLineDash([12 * s, 8 * s]);
  ctx.beginPath();
  ctx.moveTo(a.x * w, a.y * h);
  ctx.lineTo(b.x * w, b.y * h);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const p of [a, b]) {
    ctx.fillStyle = "#6cb6ff";
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Side labels: negative side → "out" area, positive side → "in" area.
  const mx = ((a.x + b.x) / 2) * w;
  const my = ((a.y + b.y) / 2) * h;
  const nx = -(b.y - a.y) * h;
  const ny = (b.x - a.x) * w;
  const len = Math.hypot(nx, ny) || 1;
  const off = 60 * s;
  ctx.font = `700 ${14 * s}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#6cb6ff";
  ctx.fillText(`← ${labels[1]}`, mx - (nx / len) * off, my - (ny / len) * off);
  ctx.fillText(`${labels[0]} →`, mx + (nx / len) * off, my + (ny / len) * off);
  ctx.restore();
}

export default function PeopleCounterDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadCounterDetector);
  const [target, setTarget] = useState<CountClass>("person");
  const counter = useRef(new LineCounter(DEFAULT_A, DEFAULT_B, { maxDist: 0.2, maxAge: 20 }));
  const [counts, setCounts] = useState({ in: 0, out: 0 });
  const [inView, setInView] = useState(0);
  const [lineKey, setLineKey] = useState(0);
  const pending = useRef<Pt | null>(null);
  const last = useRef(0);
  const labels: [string, string] = [t("crossIn"), t("crossOut")];

  const resetCounts = () => {
    counter.current.reset();
    setCounts({ in: 0, out: 0 });
  };
  const pick = (c: CountClass) => {
    setTarget(c);
    resetCounts();
  };

  const process = (ctx: CanvasRenderingContext2D, dets: Det[], track: boolean) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const pts: Pt[] = [];
    // People are tracked at the feet (the point that crosses a floor line); objects at their centre.
    const anchor = target === "person" ? 0.9 : 0.5;
    for (const d of dets) {
      if (d.name !== target) continue;
      drawBox(ctx, d.x, d.y, d.w, d.h, `${d.name} ${Math.round(d.score * 100)}%`);
      pts.push({ x: (d.x + d.w / 2) / w, y: (d.y + d.h * anchor) / h });
    }
    if (track) {
      counter.current.update(pts);
      for (const tr of counter.current.tracks) {
        ctx.fillStyle = "#3ee0a0";
        ctx.beginPath();
        ctx.arc(tr.x * w, tr.y * h, 5 * Math.max(1, w / 900), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawLine(ctx, counter.current.a, counter.current.b, labels);
    return pts.length;
  };

  return (
    <DemoStage
      webcam
      size="7 MB"
      model={model}
      samples={[
        { key: "crowdVideo", url: videos.crowd, kind: "video", onSelect: () => pick("person") },
        { key: "trafficVideo", url: videos.traffic, kind: "video", onSelect: () => pick("car") },
        { key: "conveyorVideo", url: videos.conveyor, kind: "video", onSelect: () => pick("bottle") },
        { key: "street", url: samples.street, onSelect: () => pick("person") },
      ]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onSourceChange={() => resetCounts()}
      onVideoFrame={(video, ctx, now) => {
        const n = process(ctx, model.get()!.detectFrame(video, now), true);
        if (now - last.current > 250) {
          last.current = now;
          setInView(n);
          setCounts({ ...counter.current.counts });
        }
      }}
      onImage={async (input, ctx) => {
        setInView(process(ctx, await model.get()!.detectImage(input), false));
      }}
      rerunKey={`${lineKey}-${target}`}
      onCanvasClick={(p) => {
        if (!pending.current) {
          pending.current = p;
          return;
        }
        counter.current.setLine(pending.current, p);
        pending.current = null;
        setLineKey((k) => k + 1);
      }}
    >
      <Panel title={t("countWhat")}>
        <div className="flex flex-wrap gap-2">
          {COUNT_CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              aria-pressed={target === c}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                target === c ? "border-cyan bg-cyan/10 text-cyan" : "border-line-strong hover:border-cyan"
              }`}
            >
              {t(`classes.${c}`)}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={t("results")}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [t("inView"), inView, "text-cyan"],
            [t("crossIn"), counts.in, "text-lime"],
            [t("crossOut"), counts.out, "text-pink"],
          ].map(([label, v, color]) => (
            <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className={`font-display text-2xl font-bold ${color}`}>{v}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetCounts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-cyan hover:text-cyan"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> {t("resetCount")}
          </button>
          <button
            type="button"
            onClick={() => {
              const { a, b } = counter.current;
              counter.current.setLine(b, a);
              setLineKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-cyan hover:text-cyan"
            aria-label={`${t("crossIn")} ⇄ ${t("crossOut")}`}
          >
            <ArrowRightLeft className="size-4" aria-hidden="true" /> {t("crossIn")} ⇄ {t("crossOut")}
          </button>
        </div>
        <p className="mt-4 text-xs text-dim">{t("drawLine")}</p>
      </Panel>
    </DemoStage>
  );
}
