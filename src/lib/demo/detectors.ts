"use client";

import { createWithFallback, getFileset, markMode, mediapipe, MP_MODELS, setMode } from "@/lib/demo/mediapipe";
import { transformers } from "@/lib/demo/hf";
import { hfProgress, type Progress } from "@/lib/demo/useModel";

/** A detection in canvas pixels. */
export type Det = { name: string; score: number; x: number; y: number; w: number; h: number };

/** One interface over fast (MediaPipe, synchronous) and heavier (Transformers.js, async) detectors. */
export interface Detector {
  prepare(mode: "video" | "image"): Promise<void>;
  /** All detections above the model's floor score; filter by threshold afterwards. */
  detectImage(input: HTMLCanvasElement): Promise<Det[]>;
  /** Latest detections for a video frame. Async models return the last finished result. */
  detectFrame(video: HTMLVideoElement, now: number): Det[];
}

/** EfficientDet-Lite0 via MediaPipe: ~7 MB, real-time on most laptops and phones. */
export function mediapipeDetector(opts: { allow?: string[]; minScore?: number; maxResults?: number } = {}) {
  return async (): Promise<Detector> => {
    const { ObjectDetector } = await mediapipe();
    const fs = await getFileset();
    const det = await createWithFallback((delegate) =>
      ObjectDetector.createFromOptions(fs, {
        baseOptions: { modelAssetPath: MP_MODELS.objects, delegate },
        runningMode: "VIDEO",
        scoreThreshold: opts.minScore ?? 0.2,
        maxResults: opts.maxResults ?? 40,
        ...(opts.allow ? { categoryAllowlist: opts.allow } : {}),
      }),
    );
    markMode(det, "VIDEO");
    const map = (r: ReturnType<typeof det.detect>): Det[] =>
      r.detections.flatMap((d) => {
        const c = d.categories[0];
        const b = d.boundingBox;
        return c && b ? [{ name: c.categoryName, score: c.score, x: b.originX, y: b.originY, w: b.width, h: b.height }] : [];
      });
    return {
      prepare: (mode) => setMode(det, mode === "video" ? "VIDEO" : "IMAGE"),
      detectImage: async (input) => map(det.detect(input)),
      detectFrame: (video, now) => map(det.detectForVideo(video, now)),
    };
  };
}

/** RT-DETR R18 (Apache-2.0) via Transformers.js: slower, noticeably better on small and crowded objects. */
export async function loadRtDetr(onProgress: Progress): Promise<Detector> {
  const t = await transformers();
  const pipe = await t.pipeline("object-detection", "onnx-community/rtdetr_r18vd", {
    dtype: "q8",
    progress_callback: hfProgress(onProgress),
  });
  type Out = { score: number; label: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } }[];
  const run = async (c: HTMLCanvasElement): Promise<Det[]> => {
    const out = (await pipe(t.RawImage.fromCanvas(c), { threshold: 0.15 })) as unknown as Out;
    return out.map((d) => ({
      name: d.label,
      score: d.score,
      x: d.box.xmin,
      y: d.box.ymin,
      w: d.box.xmax - d.box.xmin,
      h: d.box.ymax - d.box.ymin,
    }));
  };
  // Video: run inference on a snapshot whenever the previous one has finished; draw the latest result every frame.
  const snap = document.createElement("canvas");
  let busy = false;
  let last: Det[] = [];
  return {
    prepare: async () => {
      last = [];
    },
    detectImage: run,
    detectFrame: (video) => {
      if (!busy && video.videoWidth) {
        busy = true;
        snap.width = video.videoWidth;
        snap.height = video.videoHeight;
        snap.getContext("2d")!.drawImage(video, 0, 0);
        run(snap)
          .then((d) => (last = d))
          .catch((e) => console.error("[demo] rt-detr frame failed", e))
          .finally(() => (busy = false));
      }
      return last;
    },
  };
}
