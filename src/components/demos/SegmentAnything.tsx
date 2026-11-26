"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, RotateCcw, Plus, Minus } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { hfProgress, useModel, type Progress } from "@/lib/demo/useModel";
import { transformers } from "@/lib/demo/hf";
import { samples, videos } from "@/lib/content";

const MODEL = "Xenova/slimsam-77-uniform";
type T = Awaited<ReturnType<typeof transformers>>;
type Inputs = { original_sizes: unknown; reshaped_input_sizes: number[][] };
type Sam = {
  t: T;
  // The SAM classes are loosely typed in Transformers.js; keep the surface we use explicit.
  model: {
    get_image_embeddings(i: unknown): Promise<Record<string, unknown>>;
    (i: Record<string, unknown>): Promise<{ pred_masks: unknown; iou_scores: { data: Float32Array } }>;
  };
  processor: {
    (img: unknown): Promise<Inputs>;
    post_process_masks(m: unknown, o: unknown, r: unknown): Promise<unknown[][]>;
  };
};

/** SlimSAM: a 14 MB distilled Segment Anything. One encoder pass per image, then each click decodes in ~100 ms. */
async function loadSam(onProgress: Progress): Promise<Sam> {
  const t = await transformers();
  const progress_callback = hfProgress(onProgress);
  const [model, processor] = await Promise.all([
    t.SamModel.from_pretrained(MODEL, { dtype: "q8", progress_callback }),
    t.AutoProcessor.from_pretrained(MODEL),
  ]);
  return { t, model: model as unknown as Sam["model"], processor: processor as unknown as Sam["processor"] };
}

type Point = { x: number; y: number; positive: boolean };
type Stats = { area: number; w: number; h: number; score: number };

export default function SegmentAnythingDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadSam);
  const [points, setPoints] = useState<Point[]>([]);
  const [positive, setPositive] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const embed = useRef<{ id: number; inputs: Inputs; emb: Record<string, unknown> } | null>(null);
  const cutout = useRef<HTMLCanvasElement | null>(null);

  const download = () => {
    if (!cutout.current) return;
    const a = document.createElement("a");
    a.href = cutout.current.toDataURL("image/png");
    a.download = "segment.png";
    a.click();
  };

  return (
    <DemoStage
      webcam={false}
      size="14 MB"
      model={model}
      maxSide={1024}
      samples={[
        { key: "hardhatFrame", url: videos.hardhat, kind: "frame", at: 4 },
        { key: "bottlesFrame", url: videos.conveyor, kind: "frame", at: 6 },
        { key: "cats", url: samples.cats },
      ]}
      onSourceChange={() => {
        setPoints([]);
        setStats(null);
        cutout.current = null;
      }}
      onImage={async (input, ctx, imageId) => {
        const sam = model.get()!;
        if (embed.current?.id !== imageId) {
          const inputs = await sam.processor(sam.t.RawImage.fromCanvas(input));
          embed.current = { id: imageId, inputs, emb: await sam.model.get_image_embeddings(inputs) };
        }
        const W = input.width;
        const H = input.height;
        const s = Math.max(1, W / 900);
        if (!points.length) {
          setStats(null);
          cutout.current = null;
          return;
        }
        const { inputs, emb } = embed.current;
        const [rh, rw] = inputs.reshaped_input_sizes[0];
        const input_points = new sam.t.Tensor("float32", points.flatMap((p) => [p.x * rw, p.y * rh]), [1, 1, points.length, 2]);
        const input_labels = new sam.t.Tensor("int64", points.map((p) => BigInt(p.positive ? 1 : 0)), [1, 1, points.length]);
        const out = await sam.model({ ...emb, input_points, input_labels });
        const masks = await sam.processor.post_process_masks(out.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
        const img = sam.t.RawImage.fromTensor(masks[0][0] as never);
        const scores = Array.from(out.iou_scores.data);
        const best = scores.indexOf(Math.max(...scores));
        const n = img.channels;

        // Paint the mask, measure it, and build a transparent cut-out.
        const overlay = ctx.getImageData(0, 0, W, H);
        const src = input.getContext("2d")!.getImageData(0, 0, W, H);
        const cut = new ImageData(W, H);
        let area = 0;
        let x0 = W, y0 = H, x1 = 0, y1 = 0;
        for (let i = 0; i < W * H; i++) {
          if (!img.data[i * n + best]) continue;
          area++;
          const x = i % W;
          const y = (i / W) | 0;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          const o = i * 4;
          overlay.data[o] = overlay.data[o] * 0.45 + 34 * 0.55;
          overlay.data[o + 1] = overlay.data[o + 1] * 0.45 + 227 * 0.55;
          overlay.data[o + 2] = overlay.data[o + 2] * 0.45 + 255 * 0.55;
          cut.data[o] = src.data[o];
          cut.data[o + 1] = src.data[o + 1];
          cut.data[o + 2] = src.data[o + 2];
          cut.data[o + 3] = 255;
        }
        ctx.putImageData(overlay, 0, 0);
        if (area) {
          ctx.strokeStyle = "#3ee0a0";
          ctx.lineWidth = 2 * s;
          ctx.setLineDash([8 * s, 6 * s]);
          ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
          ctx.setLineDash([]);
          const c = document.createElement("canvas");
          c.width = x1 - x0 + 1;
          c.height = y1 - y0 + 1;
          c.getContext("2d")!.putImageData(cut, -x0, -y0);
          cutout.current = c;
        } else cutout.current = null;
        for (const p of points) {
          ctx.fillStyle = p.positive ? "#3ee0a0" : "#ff5d6c";
          ctx.strokeStyle = "#0b1424";
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.arc(p.x * W, p.y * H, 7 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        setStats({ area: area / (W * H), w: area ? x1 - x0 + 1 : 0, h: area ? y1 - y0 + 1 : 0, score: scores[best] });
      }}
      rerunKey={JSON.stringify(points)}
      onCanvasClick={(p) => setPoints((ps) => [...ps, { ...p, positive }])}
    >
      <Panel title={t("clickMode")}>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((pos) => (
            <button
              key={String(pos)}
              type="button"
              onClick={() => setPositive(pos)}
              aria-pressed={positive === pos}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                positive === pos
                  ? pos
                    ? "border-lime bg-lime/10 text-lime"
                    : "border-danger bg-danger/10 text-danger"
                  : "border-line-strong hover:border-cyan"
              }`}
            >
              {pos ? <Plus className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
              {pos ? t("include") : t("exclude")}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-dim">{t("samHint")}</p>
        <button
          type="button"
          onClick={() => setPoints([])}
          disabled={!points.length}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-cyan hover:text-cyan disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> {t("clearPoints")}
        </button>
      </Panel>
      <Panel title={t("results")}>
        {!stats ? (
          <p className="text-sm text-muted">{t("samEmpty")}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">{t("maskArea")}</dt>
              <dd className="text-right tabular text-lime">{(stats.area * 100).toFixed(1)}%</dd>
              <dt className="text-muted">{t("maskSize")}</dt>
              <dd className="text-right tabular">{stats.w} × {stats.h} px</dd>
              <dt className="text-muted">{t("maskScore")}</dt>
              <dd className="text-right tabular">{Math.round(stats.score * 100)}%</dd>
            </dl>
            <button
              type="button"
              onClick={download}
              disabled={stats.area === 0}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-cyan px-3 py-1.5 text-sm text-cyan hover:bg-cyan/10 disabled:opacity-40"
            >
              <Download className="size-4" aria-hidden="true" /> {t("downloadPng")}
            </button>
          </>
        )}
      </Panel>
    </DemoStage>
  );
}
