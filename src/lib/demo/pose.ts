"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { createWithFallback, getFileset, markMode, mediapipe, MP_MODELS } from "@/lib/demo/mediapipe";

export type LoadedPose = { task: PoseLandmarker; mp: Awaited<ReturnType<typeof mediapipe>> };

/** MediaPipe Pose Landmarker Lite (Apache-2.0, ~6 MB): 33 body points for up to four people. */
export async function loadPose(): Promise<LoadedPose> {
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
