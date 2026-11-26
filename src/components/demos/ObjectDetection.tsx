"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { loadRtDetr, mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox } from "@/lib/demo/image";
import { samples, videos } from "@/lib/content";

const palette = ["#ffc629", "#3ee0a0", "#6cb6ff", "#ff9f43", "#b49cff", "#ff7ab6"];
export const colorFor = (name: string) => palette[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % palette.length];

type Engine = "fast" | "accurate";
const factories = { fast: mediapipeDetector(), accurate: loadRtDetr } as const;
const sizes: Record<Engine, string> = { fast: "7 MB", accurate: "22 MB" };

export function drawDetections(ctx: CanvasRenderingContext2D, dets: Det[], threshold: number) {
  const counts: Record<string, number> = {};
  for (const d of dets) {
    if (d.score < threshold) continue;
    counts[d.name] = (counts[d.name] ?? 0) + 1;
    drawBox(ctx, d.x, d.y, d.w, d.h, `${d.name} ${Math.round(d.score * 100)}%`, colorFor(d.name));
  }
  return counts;
}

export default function ObjectDetectionDemo() {
  const t = useTranslations("demos.ui");
  const [engine, setEngine] = useState<Engine>("fast");
  const model = useModel(factories[engine]);
  const [threshold, setThreshold] = useState(0.4);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const lastUpdate = useRef(0);
  const cache = useRef<{ id: number; engine: Engine; dets: Det[] } | null>(null);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <DemoStage
      webcam
      size={sizes[engine]}
      model={model}
      samples={[
        { key: "trafficVideo", url: videos.traffic, kind: "video" },
        { key: "warehouseVideo", url: videos.warehouse, kind: "video" },
        { key: "street", url: samples.street },
        { key: "football", url: samples.football },
      ]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onVideoFrame={(video, ctx, now) => {
        const c = drawDetections(ctx, model.get()!.detectFrame(video, now), threshold);
        if (now - lastUpdate.current > 300) {
          lastUpdate.current = now;
          setCounts(c);
        }
      }}
      onImage={async (input, ctx, imageId) => {
        // Moving the threshold slider must not re-run a slow model on the same picture.
        if (cache.current?.id !== imageId || cache.current.engine !== engine) {
          cache.current = { id: imageId, engine, dets: await model.get()!.detectImage(input) };
        }
        setCounts(drawDetections(ctx, cache.current.dets, threshold));
      }}
      rerunKey={`${threshold}-${engine}`}
      restartKey={engine}
    >
      <Panel title={t("model")}>
        <div className="grid grid-cols-2 gap-2">
          {(["fast", "accurate"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEngine(e)}
              aria-pressed={engine === e}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                engine === e ? "border-cyan bg-cyan/10 text-cyan" : "border-line-strong hover:border-cyan"
              }`}
            >
              <span className="block font-semibold">{t(`engines.${e}`)}</span>
              <span className="block text-xs text-muted">{e === "fast" ? "EfficientDet-Lite0" : "RT-DETR R18"}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-dim">{t("enginesNote")}</p>
      </Panel>
      <Panel title={t("threshold")}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.15}
            max={0.9}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
            aria-label={t("threshold")}
          />
          <span className="w-12 text-right tabular text-sm text-cyan">{Math.round(threshold * 100)}%</span>
        </div>
      </Panel>
      <Panel title={t("results")}>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map(([name, n]) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: colorFor(name) }} />
                  {name}
                </span>
                <span className="tabular text-lime">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DemoStage>
  );
}
