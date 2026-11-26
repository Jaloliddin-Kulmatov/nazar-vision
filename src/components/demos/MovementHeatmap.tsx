"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox, turbo } from "@/lib/demo/image";
import { Heatmap } from "@/lib/demo/tracker";
import { samples, videos } from "@/lib/content";

const CLASSES = ["person", "car", "truck", "bus"] as const;
type Target = (typeof CLASSES)[number];
const loadDetector = mediapipeDetector({ allow: [...CLASSES], minScore: 0.3 });

/** Paints the grid over the frame: transparent where nothing happened, warm where most did. */
function paint(ctx: CanvasRenderingContext2D, heat: Heatmap, opacity: number) {
  if (!heat.max) return;
  const off = document.createElement("canvas");
  off.width = heat.cols;
  off.height = heat.rows;
  const octx = off.getContext("2d")!;
  const img = octx.createImageData(heat.cols, heat.rows);
  for (let i = 0; i < heat.grid.length; i++) {
    const v = Math.sqrt(heat.grid[i] / heat.max);
    if (v < 0.04) continue;
    const [r, g, b] = turbo(v);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = Math.round(255 * opacity * Math.min(1, v * 1.4));
  }
  octx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(off, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export default function MovementHeatmapDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadDetector);
  const heat = useRef(new Heatmap(64, 36));
  const [target, setTarget] = useState<Target>("person");
  const [opacity, setOpacity] = useState(0.6);
  const [boxes, setBoxes] = useState(true);
  const [stats, setStats] = useState({ inView: 0, samples: 0, hotspot: 0 });
  const startedAt = useRef(0);
  const last = useRef(0);

  const reset = () => {
    heat.current.reset();
    startedAt.current = 0;
    setStats({ inView: 0, samples: 0, hotspot: 0 });
  };
  const pick = (c: Target) => {
    setTarget(c);
    reset();
  };

  /** Where an object "is" on the floor: feet for people, centre of the wheels for vehicles. */
  const points = (dets: Det[], w: number, h: number) =>
    dets.filter((d) => d.name === target).map((d) => ({ x: (d.x + d.w / 2) / w, y: (d.y + d.h * 0.92) / h }));

  const draw = (ctx: CanvasRenderingContext2D, dets: Det[]) => {
    paint(ctx, heat.current, opacity);
    if (boxes) for (const d of dets) if (d.name === target) drawBox(ctx, d.x, d.y, d.w, d.h, `${d.name} ${Math.round(d.score * 100)}%`);
  };

  return (
    <DemoStage
      webcam
      size="7 MB"
      model={model}
      samples={[
        { key: "crowdVideo", url: videos.crowd, kind: "video", onSelect: () => pick("person") },
        { key: "warehouseVideo", url: videos.warehouse, kind: "video", onSelect: () => pick("person") },
        { key: "trafficVideo", url: videos.traffic, kind: "video", onSelect: () => pick("car") },
        { key: "street", url: samples.street, onSelect: () => pick("person") },
      ]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onSourceChange={() => reset()}
      onVideoFrame={(video, ctx, now) => {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const dets = model.get()!.detectFrame(video, now);
        // Sample about 5 times a second so a person standing still builds heat steadily.
        if (now - last.current > 200) {
          last.current = now;
          if (!startedAt.current) startedAt.current = now;
          const pts = points(dets, w, h);
          heat.current.add(pts);
          setStats({ inView: pts.length, samples: Math.round(heat.current.total), hotspot: heat.current.hotspotShare() });
        }
        draw(ctx, dets);
      }}
      onImage={async (input, ctx) => {
        const dets = await model.get()!.detectImage(input);
        heat.current.reset();
        const pts = points(dets, ctx.canvas.width, ctx.canvas.height);
        heat.current.add(pts);
        draw(ctx, dets);
        setStats({ inView: pts.length, samples: pts.length, hotspot: heat.current.hotspotShare() });
      }}
      rerunKey={`${target}-${opacity}-${boxes}`}
    >
      <Panel title={t("heatWhat")}>
        <div className="flex flex-wrap gap-2">
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              aria-pressed={target === c}
              className={`rounded-lg border px-3 py-1.5 text-sm ${target === c ? "border-cyan bg-cyan/10 text-cyan" : "border-line-strong hover:border-text"}`}
            >
              {t(`classes.${c}`)}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          <span className="flex justify-between text-muted">
            {t("heatOpacity")} <span className="tabular text-text">{Math.round(opacity * 100)}%</span>
          </span>
          <input type="range" min={0.2} max={0.9} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={boxes} onChange={(e) => setBoxes(e.target.checked)} className="size-4 accent-[var(--cyan)]" />
          {t("showBoxes")}
        </label>
      </Panel>
      <Panel title={t("results")}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [t("inView"), stats.inView],
            [t("heatSamples"), stats.samples],
            [t("heatHotspot"), `${Math.round(stats.hotspot * 100)}%`],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className="tabular font-display text-xl font-bold text-cyan">{v}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-text"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> {t("heatReset")}
        </button>
        <p className="mt-3 text-xs text-dim">{t("heatNote")}</p>
      </Panel>
    </DemoStage>
  );
}
