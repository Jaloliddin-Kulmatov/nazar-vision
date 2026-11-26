"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { RotateCcw } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { createWithFallback, getFileset, markMode, mediapipe, MP_MODELS, setMode } from "@/lib/demo/mediapipe";
import { FatigueTracker, type FatigueState } from "@/lib/demo/fatigue";
import { samples, videos } from "@/lib/content";

type Loaded = { task: FaceLandmarker; mp: Awaited<ReturnType<typeof mediapipe>> };

async function loadFace(): Promise<Loaded> {
  const mp = await mediapipe();
  const fs = await getFileset();
  const task = await createWithFallback((delegate) =>
    mp.FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MP_MODELS.faceMesh, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    }),
  );
  markMode(task, "VIDEO");
  return { task, mp };
}

type Reading = { found: boolean; eyes: number; jaw: number };

/** Draw the face mesh and read eye closure / jaw opening from the blendshapes. */
function read(ctx: CanvasRenderingContext2D, m: Loaded, r: FaceLandmarkerResult, closeThr: number): Reading {
  const lm = r.faceLandmarks[0];
  const shapes = r.faceBlendshapes?.[0]?.categories;
  if (!lm || !shapes) return { found: false, eyes: 0, jaw: 0 };
  const score = (n: string) => shapes.find((c) => c.categoryName === n)?.score ?? 0;
  const eyes = (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2;
  const jaw = score("jawOpen");

  const F = m.mp.FaceLandmarker;
  const du = new m.mp.DrawingUtils(ctx);
  const s = Math.max(1, ctx.canvas.width / 900);
  du.drawConnectors(lm, F.FACE_LANDMARKS_TESSELATION, { color: "rgba(255,198,41,0.14)", lineWidth: 0.6 * s });
  const eyeColor = eyes >= closeThr ? "#ff5d6c" : "#3ee0a0";
  for (const set of [F.FACE_LANDMARKS_LEFT_EYE, F.FACE_LANDMARKS_RIGHT_EYE, F.FACE_LANDMARKS_LEFT_IRIS, F.FACE_LANDMARKS_RIGHT_IRIS]) {
    du.drawConnectors(lm, set, { color: eyeColor, lineWidth: 2 * s });
  }
  du.drawConnectors(lm, F.FACE_LANDMARKS_LIPS, { color: jaw >= 0.5 ? "#ff9f43" : "#ffc629", lineWidth: 2 * s });
  return { found: true, eyes, jaw };
}

function Meter({ label, value, warn }: { label: string; value: number; warn: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={`tabular ${value >= warn ? "text-danger" : "text-lime"}`}>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${value >= warn ? "bg-danger" : "bg-lime"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const EMPTY: FatigueState = { eyesClosed: false, closedMs: 0, blinks: 0, yawns: 0, perclos: 0, alert: "none" };

export default function FatigueMonitorDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadFace);
  const tracker = useRef(new FatigueTracker());
  const [reading, setReading] = useState<Reading>({ found: false, eyes: 0, jaw: 0 });
  const [fs, setFs] = useState<FatigueState>(EMPTY);
  const [live, setLive] = useState(false);
  const last = useRef(0);

  const reset = () => {
    tracker.current.reset();
    setFs(EMPTY);
  };

  const status = fs.alert === "microsleep" ? "danger" : fs.alert === "drowsy" ? "amber" : "lime";

  return (
    <DemoStage
      webcam
      size="4 MB"
      model={model}
      samples={[
        { key: "driverVideo", url: videos.driver, kind: "video" },
        { key: "tiredVideo", url: videos.tired, kind: "video" },
        { key: "portrait", url: samples.portrait },
      ]}
      prepare={async (mode) => setMode(model.get()!.task, mode === "video" ? "VIDEO" : "IMAGE")}
      onSourceChange={(src) => {
        reset();
        setLive(src === "webcam" || src === "video");
      }}
      onVideoFrame={(video, ctx, now) => {
        const m = model.get()!;
        const r = read(ctx, m, m.task.detectForVideo(video, now), 0.5);
        const f = r.found ? tracker.current.update(now, r.eyes, r.jaw) : tracker.current.update(now, 0, 0);
        if (f.alert !== "none") {
          ctx.save();
          ctx.strokeStyle = f.alert === "microsleep" ? "#ff5d6c" : "#ff9f43";
          ctx.lineWidth = Math.max(6, ctx.canvas.width / 120);
          ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.restore();
        }
        if (now - last.current > 150) {
          last.current = now;
          setReading(r);
          setFs(f);
        }
      }}
      onImage={(input, ctx) => {
        const m = model.get()!;
        setReading(read(ctx, m, m.task.detect(input), 0.5));
      }}
    >
      <Panel title={t("fatigueStatus")}>
        {live ? (
          <div
            className={`rounded-xl border p-3 font-semibold ${
              status === "danger"
                ? "border-danger bg-danger/15 text-danger"
                : status === "amber"
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-lime/40 bg-lime/5 text-lime"
            }`}
            role="status"
          >
            {t(`fatigue.${fs.alert}`)}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("fatigueLiveOnly")}</p>
        )}
        {!reading.found && <p className="mt-3 text-sm text-muted">{t("noFace")}</p>}
        <div className="mt-4 space-y-3">
          <Meter label={t("eyeClosure")} value={reading.eyes} warn={0.5} />
          <Meter label={t("jawOpen")} value={reading.jaw} warn={0.5} />
        </div>
      </Panel>
      {live && (
        <Panel title={t("results")}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [t("blinks"), fs.blinks],
              [t("yawns"), fs.yawns],
              ["PERCLOS", `${Math.round(fs.perclos * 100)}%`],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
                <p className="font-display text-xl font-bold text-cyan">{v}</p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-cyan hover:text-cyan"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> {t("resetCount")}
          </button>
          <p className="mt-3 text-xs text-dim">{t("perclosNote")}</p>
        </Panel>
      )}
    </DemoStage>
  );
}
