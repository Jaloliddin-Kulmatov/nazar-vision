"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { createWithFallback, getFileset, markMode, mediapipe, MP_MODELS, setMode } from "@/lib/demo/mediapipe";
import { videos } from "@/lib/content";

type Loaded = { task: GestureRecognizer; mp: Awaited<ReturnType<typeof mediapipe>> };

const emoji: Record<string, string> = {
  Thumb_Up: "👍", Thumb_Down: "👎", Victory: "✌️", Open_Palm: "✋",
  Closed_Fist: "✊", Pointing_Up: "☝️", ILoveYou: "🤟", None: "·",
};

async function loadGestures(): Promise<Loaded> {
  const mp = await mediapipe();
  const fs = await getFileset();
  const task = await createWithFallback((delegate) =>
    mp.GestureRecognizer.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MP_MODELS.gestures, delegate },
      runningMode: "VIDEO",
      numHands: 2,
    }),
  );
  markMode(task, "VIDEO");
  return { task, mp };
}

type Hand = { side: string; gesture: string; score: number };

function draw(ctx: CanvasRenderingContext2D, m: Loaded, res: GestureRecognizerResult): Hand[] {
  const du = new m.mp.DrawingUtils(ctx);
  const s = Math.max(1, ctx.canvas.width / 900);
  return res.landmarks.map((lm, i) => {
    du.drawConnectors(lm, m.mp.GestureRecognizer.HAND_CONNECTIONS, { color: "#ffc629", lineWidth: 3 * s });
    du.drawLandmarks(lm, { color: "#3ee0a0", fillColor: "#0b1424", radius: 3 * s, lineWidth: 2 * s });
    const g = res.gestures[i]?.[0];
    return {
      side: res.handedness[i]?.[0]?.categoryName ?? "",
      gesture: g?.categoryName ?? "None",
      score: g?.score ?? 0,
    };
  });
}

export default function HandGesturesDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadGestures);
  const [hands, setHands] = useState<Hand[]>([]);
  const last = useRef(0);

  return (
    <DemoStage
      webcam
      size="8 MB"
      model={model}
      samples={[{ key: "handsVideo", url: videos.hands, kind: "video" }]}
      prepare={async (mode) => setMode(model.get()!.task, mode === "video" ? "VIDEO" : "IMAGE")}
      onVideoFrame={(video, ctx, now) => {
        const m = model.get()!;
        const h = draw(ctx, m, m.task.recognizeForVideo(video, now));
        if (now - last.current > 200) {
          last.current = now;
          setHands(h);
        }
      }}
      onImage={(input, ctx) => {
        const m = model.get()!;
        setHands(draw(ctx, m, m.task.recognize(input)));
      }}
    >
      <Panel title={t("results")}>
        {hands.length === 0 ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : (
          <ul className="space-y-3">
            {hands.map((h, i) => (
              <li key={i} className="flex items-center gap-4 rounded-xl border border-line bg-bg-2 p-3">
                <span className="text-4xl" aria-hidden="true">{emoji[h.gesture] ?? "✋"}</span>
                <div>
                  <p className="font-semibold">{h.gesture.replace(/_/g, " ")}</p>
                  <p className="tabular text-xs text-muted">
                    {h.side} · {t("confidence")} {Math.round(h.score * 100)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-dim">👍 👎 ✌️ ✋ ✊ ☝️ 🤟</p>
      </Panel>
    </DemoStage>
  );
}
