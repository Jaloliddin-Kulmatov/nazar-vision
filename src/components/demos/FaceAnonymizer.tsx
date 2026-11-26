"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FaceDetector, Detection } from "@mediapipe/tasks-vision";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { createWithFallback, getFileset, markMode, mediapipe, MP_MODELS, setMode } from "@/lib/demo/mediapipe";
import { drawBox, obscureRegion } from "@/lib/demo/image";
import { samples, videos } from "@/lib/content";

type Mode = "blur" | "pixelate" | "box";

async function loadFaceDetector(): Promise<FaceDetector> {
  const { FaceDetector } = await mediapipe();
  const fs = await getFileset();
  const det = await createWithFallback((delegate) =>
    FaceDetector.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MP_MODELS.faces, delegate },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
    }),
  );
  markMode(det, "VIDEO");
  return det;
}

function anonymize(ctx: CanvasRenderingContext2D, source: CanvasImageSource, dets: Detection[], mode: Mode) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  for (const d of dets) {
    const b = d.boundingBox;
    if (!b) continue;
    // Grow the box: the detector hugs the face tightly; we want hair and ears covered too.
    const padX = b.width * 0.25;
    const padY = b.height * 0.35;
    const x = Math.max(0, b.originX - padX);
    const y = Math.max(0, b.originY - padY);
    const w = Math.min(W - x, b.width + padX * 2);
    const h = Math.min(H - y, b.height + padY * 2);
    if (mode === "box") drawBox(ctx, b.originX, b.originY, b.width, b.height, `face ${Math.round(d.categories[0].score * 100)}%`);
    else obscureRegion(ctx, source, x, y, w, h, mode);
  }
  return dets.length;
}

export default function FaceAnonymizerDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadFaceDetector);
  const [mode, setModeState] = useState<Mode>("blur");
  const [faces, setFaces] = useState(0);
  const last = useRef(0);

  return (
    <DemoStage
      webcam
      size="0.2 MB"
      model={model}
      samples={[
        { key: "crowdVideo", url: videos.crowd, kind: "video" },
        { key: "portrait", url: samples.portrait },
        { key: "manCar", url: samples.manCar },
      ]}
      prepare={async (m) => setMode(model.get()!, m === "video" ? "VIDEO" : "IMAGE")}
      onVideoFrame={(video, ctx, now) => {
        const n = anonymize(ctx, video, model.get()!.detectForVideo(video, now).detections, mode);
        if (now - last.current > 300) {
          last.current = now;
          setFaces(n);
        }
      }}
      onImage={(input, ctx) => setFaces(anonymize(ctx, input, model.get()!.detect(input).detections, mode))}
      rerunKey={mode}
    >
      <Panel title={t("results")}>
        <p className="font-display text-3xl font-bold text-cyan">{faces}</p>
        <p className="text-sm text-muted">{t("faces")}</p>
      </Panel>
      <Panel title={t("style")}>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {(["blur", "pixelate", "box"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setModeState(m)}
              className={`rounded-lg border px-2 py-2 text-sm ${mode === m ? "border-cyan bg-cyan/15 text-cyan" : "border-line-strong text-muted hover:text-text"}`}
            >
              {t(m)}
            </button>
          ))}
        </div>
      </Panel>
    </DemoStage>
  );
}
