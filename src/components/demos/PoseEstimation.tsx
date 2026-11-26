"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PoseLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { createWithFallback, getFileset, markMode, mediapipe, MP_MODELS, setMode } from "@/lib/demo/mediapipe";
import { samples, videos } from "@/lib/content";

type Loaded = { task: PoseLandmarker; mp: Awaited<ReturnType<typeof mediapipe>> };

async function loadPose(): Promise<Loaded> {
  const mp = await mediapipe();
  const fs = await getFileset();
  const task = await createWithFallback((delegate) =>
    mp.PoseLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MP_MODELS.pose, delegate },
      runningMode: "VIDEO",
      numPoses: 4,
    }),
  );
  markMode(task, "VIDEO");
  return { task, mp };
}

type Body = { tilt: number; handsUp: boolean };

/** Torso tilt from vertical (degrees) and whether both wrists are above the shoulders. */
function analyse(lm: NormalizedLandmark[], w: number, h: number): Body {
  const mid = (a: NormalizedLandmark, b: NormalizedLandmark) => ({ x: ((a.x + b.x) / 2) * w, y: ((a.y + b.y) / 2) * h });
  const sh = mid(lm[11], lm[12]);
  const hip = mid(lm[23], lm[24]);
  const tilt = Math.abs((Math.atan2(sh.x - hip.x, hip.y - sh.y) * 180) / Math.PI);
  const handsUp = lm[15].y < lm[11].y && lm[16].y < lm[12].y;
  return { tilt: Math.round(tilt), handsUp };
}

function draw(ctx: CanvasRenderingContext2D, m: Loaded, poses: NormalizedLandmark[][]): Body[] {
  const du = new m.mp.DrawingUtils(ctx);
  const s = Math.max(1, ctx.canvas.width / 900);
  return poses.map((lm) => {
    du.drawConnectors(lm, m.mp.PoseLandmarker.POSE_CONNECTIONS, { color: "#ffc629", lineWidth: 3 * s });
    du.drawLandmarks(lm, { color: "#3ee0a0", fillColor: "#0b1424", radius: 3 * s, lineWidth: 2 * s });
    return analyse(lm, ctx.canvas.width, ctx.canvas.height);
  });
}

export default function PoseEstimationDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadPose);
  const [bodies, setBodies] = useState<Body[]>([]);
  const last = useRef(0);

  return (
    <DemoStage
      webcam
      size="6 MB"
      model={model}
      samples={[
        { key: "workersVideo", url: videos.workers, kind: "video" },
        { key: "squatVideo", url: videos.squat, kind: "video" },
        { key: "manCar", url: samples.manCar },
        { key: "football", url: samples.football },
      ]}
      prepare={async (mode) => setMode(model.get()!.task, mode === "video" ? "VIDEO" : "IMAGE")}
      onVideoFrame={(video, ctx, now) => {
        const m = model.get()!;
        const res = m.task.detectForVideo(video, now);
        const b = draw(ctx, m, res.landmarks);
        if (now - last.current > 300) {
          last.current = now;
          setBodies(b);
        }
      }}
      onImage={(input, ctx) => {
        const m = model.get()!;
        setBodies(draw(ctx, m, m.task.detect(input).landmarks));
      }}
    >
      <Panel title={t("results")}>
        <p className="font-display text-3xl font-bold text-cyan">{bodies.length}</p>
        <p className="mb-4 text-sm text-muted">{t("bodies")}</p>
        {bodies.length > 0 && (
          <ul className="space-y-2 text-sm">
            {bodies.map((b, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg-2 px-3 py-2">
                <span className="tabular text-dim">#{i + 1}</span>
                <span>
                  {t("torsoAngle")}: <span className="tabular">{b.tilt}°</span>
                </span>
                <span className={b.tilt > 45 ? "text-amber" : "text-lime"}>{b.tilt > 45 ? t("bending") : t("upright")}</span>
                {b.handsUp && <span className="text-cyan">🙌 {t("handsUp")}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DemoStage>
  );
}
