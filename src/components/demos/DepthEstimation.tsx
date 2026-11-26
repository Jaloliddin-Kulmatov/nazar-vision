"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { hfProgress, useModel, type Progress } from "@/lib/demo/useModel";
import { transformers } from "@/lib/demo/hf";
import { turbo } from "@/lib/demo/image";
import { samples } from "@/lib/content";

type DepthFn = (input: HTMLCanvasElement) => Promise<HTMLCanvasElement>;

async function loadDepth(onProgress: Progress): Promise<DepthFn> {
  const { pipeline } = await transformers();
  const estimate = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", {
    dtype: "q8",
    progress_callback: hfProgress(onProgress),
  });
  return async (input) => {
    const out = await estimate(input);
    const { depth } = Array.isArray(out) ? out[0] : out;
    // depth is a 1-channel image (bright = near). Colourise it.
    const c = document.createElement("canvas");
    c.width = depth.width;
    c.height = depth.height;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(depth.width, depth.height);
    const ch = depth.channels;
    for (let i = 0, j = 0; j < depth.width * depth.height; i += ch, j++) {
      const [r, g, b] = turbo(depth.data[i] / 255);
      img.data[j * 4] = r;
      img.data[j * 4 + 1] = g;
      img.data[j * 4 + 2] = b;
      img.data[j * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  };
}

export default function DepthEstimationDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadDepth);
  const [blend, setBlend] = useState(1);
  const cache = useRef<{ id: number; map: HTMLCanvasElement } | null>(null);

  return (
    <DemoStage
      webcam={false}
      size="25 MB"
      model={model}
      maxSide={768}
      samples={[{ key: "house", url: samples.house }, { key: "street", url: samples.street }, { key: "cats", url: samples.cats }]}
      onImage={async (input, ctx, id) => {
        if (cache.current?.id !== id) cache.current = { id, map: await model.get()!(input) };
        ctx.globalAlpha = blend;
        ctx.drawImage(cache.current.map, 0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1;
      }}
      rerunKey={blend}
    >
      <Panel title={t("blend")}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={blend}
          onChange={(e) => setBlend(Number(e.target.value))}
          className="w-full"
          aria-label={t("blend")}
        />
        <div
          className="mt-4 h-3 rounded-full"
          style={{ background: `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((x) => `rgb(${turbo(x).join(",")})`).join(",")})` }}
          aria-hidden="true"
        />
        <div className="mt-1 flex justify-between tabular text-xs text-muted">
          <span>{t("far")}</span>
          <span>{t("near")}</span>
        </div>
      </Panel>
    </DemoStage>
  );
}
