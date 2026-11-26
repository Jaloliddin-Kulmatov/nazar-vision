"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { hfProgress, useModel, type Progress } from "@/lib/demo/useModel";
import { transformers } from "@/lib/demo/hf";
import { videos } from "@/lib/content";

const MODEL = "Xenova/swin2SR-classical-sr-x2-64";
/** Input is kept small: the model makes it twice as large, and that work grows with the square of the size. */
const MAX_SIDE = 256;

type Upscaler = (input: HTMLCanvasElement) => Promise<HTMLCanvasElement>;

async function loadUpscaler(onProgress: Progress): Promise<Upscaler> {
  const t = await transformers();
  const pipe = await t.pipeline("image-to-image", MODEL, { dtype: "q8", progress_callback: hfProgress(onProgress) });
  return async (input) => {
    const out = (await pipe(t.RawImage.fromCanvas(input))) as unknown as { toCanvas(): HTMLCanvasElement | OffscreenCanvas };
    const big = out.toCanvas();
    // The model pads to a multiple of 64; crop back to exactly 2× the input.
    const c = document.createElement("canvas");
    c.width = input.width * 2;
    c.height = input.height * 2;
    c.getContext("2d")!.drawImage(big as CanvasImageSource, 0, 0, c.width, c.height, 0, 0, c.width, c.height);
    return c;
  };
}

export default function ImageEnhanceDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadUpscaler);
  const [split, setSplit] = useState(0.5);
  const [ms, setMs] = useState<number | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const cache = useRef<{ id: number; out: HTMLCanvasElement } | null>(null);

  const compose = (ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, out: HTMLCanvasElement) => {
    const c = ctx.canvas;
    c.width = out.width;
    c.height = out.height;
    const cut = Math.round(c.width * split);
    // Left: the same small picture simply zoomed in. Right: the model's output.
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(input, 0, 0, c.width, c.height);
    ctx.drawImage(out, cut, 0, c.width - cut, c.height, cut, 0, c.width - cut, c.height);
    const s = Math.max(1, c.width / 900);
    ctx.fillStyle = "#ffc629";
    ctx.fillRect(cut - 1.5 * s, 0, 3 * s, c.height);
    ctx.font = `700 ${13 * s}px ui-monospace, monospace`;
    const tag = (text: string, x: number, align: CanvasTextAlign) => {
      ctx.textAlign = align;
      const w = ctx.measureText(text).width + 12 * s;
      ctx.fillStyle = "rgba(11,20,36,0.85)";
      ctx.fillRect(align === "left" ? x : x - w, 10 * s, w, 22 * s);
      ctx.fillStyle = "#eef3fa";
      ctx.fillText(text, align === "left" ? x + 6 * s : x - 6 * s, 25 * s);
    };
    tag(t("enhanceBefore"), 10 * s, "left");
    tag(t("enhanceAfter"), c.width - 10 * s, "right");
  };

  return (
    <DemoStage
      webcam={false}
      size="21 MB"
      model={model}
      maxSide={MAX_SIDE}
      samples={[
        { key: "trafficFrame", url: videos.traffic, kind: "frame", at: 3 },
        { key: "hardhatFrame", url: videos.hardhat, kind: "frame", at: 4 },
        { key: "crowdFrame", url: videos.crowd, kind: "frame", at: 2 },
      ]}
      onSourceChange={() => {
        cache.current = null;
        setMs(null);
      }}
      onImage={async (input, ctx, imageId) => {
        let out = cache.current?.id === imageId ? cache.current.out : null;
        if (!out) {
          const t0 = performance.now();
          out = await model.get()!(input);
          setMs(performance.now() - t0);
          cache.current = { id: imageId, out };
        }
        setSize({ w: input.width, h: input.height });
        compose(ctx, input, out);
      }}
      rerunKey={split}
    >
      <Panel title={t("enhanceCompare")}>
        <label className="block text-sm">
          <span className="flex justify-between text-muted">
            {t("enhanceSplit")} <span className="tabular text-text">{Math.round(split * 100)}%</span>
          </span>
          <input type="range" min={0} max={1} step={0.01} value={split} onChange={(e) => setSplit(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        {size && (
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">{t("enhanceIn")}</dt>
            <dd className="tabular text-right">
              {size.w} × {size.h}
            </dd>
            <dt className="text-muted">{t("enhanceOut")}</dt>
            <dd className="tabular text-right text-lime">
              {size.w * 2} × {size.h * 2}
            </dd>
            {ms !== null && (
              <>
                <dt className="text-muted">{t("enhanceTime")}</dt>
                <dd className="tabular text-right">{(ms / 1000).toFixed(1)} s</dd>
              </>
            )}
          </dl>
        )}
        <button
          type="button"
          disabled={ms === null}
          onClick={() => {
            const out = cache.current?.out;
            if (!out) return;
            const a = document.createElement("a");
            a.href = out.toDataURL("image/png");
            a.download = "enhanced.png";
            a.click();
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-bg hover:bg-cyan-hi disabled:opacity-40"
        >
          <Download className="size-4" aria-hidden="true" /> {t("enhanceDownload")}
        </button>
        <p className="mt-3 text-xs text-dim">{t("enhanceNote")}</p>
      </Panel>
    </DemoStage>
  );
}
