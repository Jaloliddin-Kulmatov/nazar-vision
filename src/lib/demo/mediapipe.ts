"use client";

import type { FilesetResolver } from "@mediapipe/tasks-vision";

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

const VERSION = "1.2.3";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const M = "https://storage.googleapis.com/mediapipe-models";

export const MP_MODELS = {
  objects: `${M}/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
  faces: `${M}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
  pose: `${M}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
  gestures: `${M}/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`,
  faceMesh: `${M}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
} as const;

let fileset: Promise<WasmFileset> | null = null;

export const mediapipe = () => import("@mediapipe/tasks-vision");

export async function getFileset(): Promise<WasmFileset> {
  if (!fileset) {
    fileset = mediapipe().then(({ FilesetResolver }) => FilesetResolver.forVisionTasks(WASM));
    fileset.catch(() => (fileset = null));
  }
  return fileset;
}

/** Try the GPU delegate first, fall back to CPU (some laptops/browsers lack WebGL2 support). */
export async function createWithFallback<T>(
  create: (delegate: "GPU" | "CPU") => Promise<T>,
): Promise<T> {
  try {
    return await create("GPU");
  } catch (e) {
    console.warn("[demo] GPU delegate failed, using CPU", e);
    return create("CPU");
  }
}

type RunningMode = "IMAGE" | "VIDEO";
const modes = new WeakMap<object, RunningMode>();

/** MediaPipe tasks need an explicit running mode; switch only when it changes. */
export async function setMode(
  task: { setOptions(o: { runningMode: RunningMode }): Promise<void> },
  mode: RunningMode,
) {
  if (modes.get(task) === mode) return;
  await task.setOptions({ runningMode: mode });
  modes.set(task, mode);
}

export function markMode(task: object, mode: RunningMode) {
  modes.set(task, mode);
}
