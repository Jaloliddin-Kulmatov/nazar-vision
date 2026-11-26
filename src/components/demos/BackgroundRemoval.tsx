"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { hfProgress, useModel, type Progress } from "@/lib/demo/useModel";
import { hasWebGPU, transformers } from "@/lib/demo/hf";
import { samples } from "@/lib/content";

type Quality = "fast" | "best";
type Remover = (input: HTMLCanvasElement) => Promise<HTMLCanvasElement>;

function makeFactory(quality: Quality) {
  return async (onProgress: Progress): Promise<Remover> => {
    const { pipeline } = await transformers();
    const opts =
      quality === "best"
        ? { device: "webgpu" as const, dtype: "fp16" as const }
        : { dtype: "q8" as const };
    const model = quality === "best" ? "onnx-community/BiRefNet_lite-ONNX" : "Xenova/modnet";
    const remove = await pipeline("background-removal", model, { ...opts, progress_callback: hfProgress(onProgress) });
    return async (input) => {
      const out = await remove(input);
      const img = Array.isArray(out) ? out[0] : out;
      return img.toCanvas() as HTMLCanvasElement;
    };
  };
}

function checkerboard(ctx: CanvasRenderingContext2D) {
  const s = Math.max(12, Math.round(ctx.canvas.width / 60));
  for (let y = 0; y < ctx.canvas.height; y += s)
    for (let x = 0; x < ctx.canvas.width; x += s) {
      ctx.fillStyle = (x / s + y / s) % 2 === 0 ? "#1a2438" : "#111a2c";
      ctx.fillRect(x, y, s, s);
    }
}

export default function BackgroundRemovalDemo() {
  const t = useTranslations("demos.ui");
  const gpu = typeof window !== "undefined" && hasWebGPU();
  const [quality, setQuality] = useState<Quality>("fast");
  const factory = useMemo(() => makeFactory(quality), [quality]);
  const model = useModel(factory);
  const result = useRef<HTMLCanvasElement | null>(null);
  const [hasResult, setHasResult] = useState(false);

  return (
    <DemoStage
      webcam={false}
      size={quality === "best" ? "109 MB" : "6 MB"}
      model={model}
      maxSide={1024}
      samples={[{ key: "portrait", url: samples.portrait }, { key: "manCar", url: samples.manCar }, { key: "cats", url: samples.cats }]}
      onImage={async (input, ctx) => {
        const cut = await model.get()!(input);
        result.current = cut;
        checkerboard(ctx);
        ctx.drawImage(cut, 0, 0, ctx.canvas.width, ctx.canvas.height);
        setHasResult(true);
      }}
      rerunKey={quality}
      onSourceChange={() => setHasResult(false)}
    >
      <Panel title={t("quality")}>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["fast", "best"] as const).map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={quality === q}
              disabled={q === "best" && !gpu}
              onClick={() => setQuality(q)}
              className={`rounded-lg border px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                quality === q ? "border-cyan bg-cyan/15 text-cyan" : "border-line-strong text-muted hover:text-text"
              }`}
            >
              {t(q)}
            </button>
          ))}
        </div>
        {!gpu && <p className="mt-3 text-xs text-dim">{t("qualityNote")}</p>}
      </Panel>
      <Panel title={t("results")}>
        {hasResult ? (
          <button
            type="button"
            onClick={() =>
              result.current?.toBlob((blob) => {
                if (!blob) return;
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "cutout.png";
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }, "image/png")
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-bg hover:bg-cyan-hi"
          >
            <Download className="size-4" aria-hidden="true" /> {t("download")}
          </button>
        ) : (
          <p className="text-sm text-muted">{t("noResults")}</p>
        )}
      </Panel>
    </DemoStage>
  );
}
