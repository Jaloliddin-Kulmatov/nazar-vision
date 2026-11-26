"use client";

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type DragEvent, type MouseEvent, type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  Camera, ImageUp, Images, Film, Square, Pause, Play, Loader2, AlertTriangle, RotateCcw, ShieldCheck, Upload, ScanSearch, LayoutGrid,
} from "lucide-react";
import { fitWithin, loadImage, loadVideoFrame } from "@/lib/demo/image";
import { thumbFor } from "@/lib/content";
import type { ModelState } from "@/lib/demo/useModel";

export type Sample = {
  key: string;
  url: string | (() => string | Promise<string>);
  onSelect?: () => void;
  /** "video": play looped through the live pipeline. "frame": use one frame of a video as a still image. */
  kind?: "image" | "video" | "frame";
  /** Seconds into the video, for "frame" samples. */
  at?: number;
  /** Picture for the scene picker; worked out from the URL when left out. */
  thumb?: string;
};

type Props = {
  webcam: boolean;
  samples?: Sample[];
  model: { state: ModelState; progress: number | null; load: () => Promise<unknown> };
  size: string;
  /** Called after the model is loaded and before frames/images are processed. */
  prepare?: (mode: "video" | "image") => Promise<void>;
  /** Called every animation frame while the webcam runs; the frame is already drawn on ctx. */
  onVideoFrame?: (video: HTMLVideoElement, ctx: CanvasRenderingContext2D, now: number) => void;
  /** Called once per still image (and again when rerunKey changes); the image is already drawn on ctx. */
  onImage?: (input: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageId: number) => void | Promise<void>;
  rerunKey?: unknown;
  /** When this changes while a webcam or video is running, the stream restarts (e.g. after a model switch). */
  restartKey?: unknown;
  maxSide?: number;
  onCanvasClick?: (p: { x: number; y: number }) => void;
  onSourceChange?: (source: Source) => void;
  /** Right-hand panel: controls and results. */
  children?: ReactNode;
  /**
   * Start the first sample as soon as the page opens. Defaults to on for live demos
   * (their models are a few MB); big models wait for a click. `?sample=<key>` in the
   * URL always starts that sample.
   */
  autoStart?: boolean;
};

export type Source = "none" | "webcam" | "video" | "image";
type ErrorKind = null | "camera" | "model" | "image" | "video";
type LiveInput = "webcam" | string | File;
type StillInput = { src: string | File; frameAt?: number };

export default function DemoStage({
  webcam, samples = [], model, size, prepare, onVideoFrame, onImage,
  rerunKey, restartKey, maxSide = 1280, onCanvasClick, onSourceChange, children, autoStart = webcam,
}: Props) {
  const t = useTranslations("demos.ui");
  const c = useTranslations("common");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputCanvas = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrl = useRef<string | null>(null);
  const rafRef = useRef(0);
  const imageId = useRef(0);

  const [source, setSource] = useState<Source>("none");
  const [error, setError] = useState<ErrorKind>(null);
  const [busy, setBusy] = useState(false);
  const [fps, setFps] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [retryTarget, setRetryTarget] = useState<null | { kind: "live"; input: LiveInput } | { kind: "still"; input: StillInput }>(null);

  // Keep the latest callbacks in refs so the animation loop never sees stale closures.
  const cb = useRef({ prepare, onVideoFrame, onImage, onSourceChange });
  useLayoutEffect(() => {
    cb.current = { prepare, onVideoFrame, onImage, onSourceChange };
  });

  const changeSource = useCallback((s: Source) => {
    setSource(s);
    cb.current.onSourceChange?.(s);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      if (video.getAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setPaused(false);
    setFps(0);
  }, []);

  useEffect(() => stop, [stop]);

  const ensureModel = useCallback(async () => {
    try {
      await model.load();
      return true;
    } catch {
      setError("model");
      return false;
    }
  }, [model]);

  /** Run the per-frame pipeline on the webcam or on a looping video file. */
  const startLive = useCallback(async (input: LiveInput) => {
    setRetryTarget({ kind: "live", input });
    stop();
    setError(null);
    setBusy(true);
    if (!(await ensureModel())) return setBusy(false);

    const video = videoRef.current!;
    if (input === "webcam") {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        setBusy(false);
        return setError("camera");
      }
      streamRef.current = stream;
      video.loop = false;
      video.srcObject = stream;
    } else {
      const url = typeof input === "string" ? input : URL.createObjectURL(input);
      if (typeof input !== "string") objectUrl.current = url;
      video.loop = true;
      video.src = url;
    }
    try {
      await video.play();
    } catch (e) {
      console.error(e);
      stop();
      setBusy(false);
      return setError(input === "webcam" ? "camera" : "video");
    }
    try {
      await cb.current.prepare?.("video");
    } catch (e) {
      console.error(e);
      stop();
      setBusy(false);
      return setError("model");
    }
    setBusy(false);
    changeSource(input === "webcam" ? "webcam" : "video");

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      if (video.readyState >= 2 && video.videoWidth) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          cb.current.onVideoFrame?.(video, ctx, performance.now());
        } catch (e) {
          console.error("[demo] frame failed", e);
        }
        frames++;
        const now = performance.now();
        if (now - last >= 1000) {
          setFps(Math.round((frames * 1000) / (now - last)));
          frames = 0;
          last = now;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [changeSource, ensureModel, stop]);

  const runImage = useCallback(async () => {
    const input = inputCanvas.current;
    const canvas = canvasRef.current;
    if (!input || !canvas) return;
    canvas.width = input.width;
    canvas.height = input.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(input, 0, 0);
    setBusy(true);
    if (!(await ensureModel())) return setBusy(false);
    try {
      await cb.current.prepare?.("image");
      ctx.drawImage(input, 0, 0);
      await cb.current.onImage?.(input, ctx, imageId.current);
    } catch (e) {
      console.error("[demo] image failed", e);
      setError("model");
    }
    setBusy(false);
  }, [ensureModel]);

  const loadStill = useCallback(
    async (input: StillInput) => {
      setRetryTarget({ kind: "still", input });
      stop();
      setError(null);
      setBusy(true);
      const { src, frameAt } = input;
      const load = (s: string | File) => (frameAt != null ? loadVideoFrame(s, frameAt) : loadImage(s));
      let img: HTMLImageElement | HTMLCanvasElement;
      try {
        img = await load(src);
      } catch {
        // Remote samples occasionally time out on a CDN hop; one quiet retry fixes most of those.
        try {
          if (typeof src !== "string" || src.startsWith("data:")) throw new Error("no retry");
          await new Promise((r) => setTimeout(r, 800));
          img = await load(`${src}${src.includes("?") ? "&" : "?"}retry=1`);
        } catch {
          setBusy(false);
          return setError(frameAt != null ? "video" : "image");
        }
      }
      const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
      const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
      const { w, h } = fitWithin(iw, ih, maxSide);
      const canvas = (inputCanvas.current ??= document.createElement("canvas"));
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      imageId.current++;
      changeSource("image");
      await runImage();
    },
    [changeSource, maxSide, runImage, stop],
  );

  /** A user file: videos play live where the demo supports it, otherwise one frame is analysed. */
  const openFile = (f: File) => {
    if (f.type.startsWith("video/")) {
      if (webcam) void startLive(f);
      else void loadStill({ src: f, frameAt: 1 });
    } else if (f.type.startsWith("image/")) {
      void loadStill({ src: f });
    }
  };

  // Re-run on settings changes (threshold, labels, mode…) for still images.
  useEffect(() => {
    if (source !== "image" || busy) return;
    const id = requestAnimationFrame(() => void runImage());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rerunKey]);

  // Restart a running stream when the demo swaps models.
  useEffect(() => {
    if ((source !== "webcam" && source !== "video") || busy || retryTarget?.kind !== "live") return;
    const input = retryTarget.input;
    const id = requestAnimationFrame(() => void startLive(input));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  const pickSample = async (s: Sample) => {
    s.onSelect?.();
    const url = typeof s.url === "function" ? await s.url() : s.url;
    if (s.kind === "video") void startLive(url);
    else void loadStill({ src: url, frameAt: s.kind === "frame" ? (s.at ?? 1) : undefined });
  };

  const live = source === "webcam" || source === "video";

  // Open straight into a running example: no blank screen to puzzle over.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || samples.length === 0) return;
    const wanted = new URLSearchParams(window.location.search).get("sample");
    const pick = samples.find((s) => s.key === wanted) ?? (autoStart ? samples[0] : undefined);
    if (!pick) return;
    // The flag is set when the sample really starts, so a cancelled first run (React dev mode) can retry.
    const id = requestAnimationFrame(() => {
      started.current = true;
      void pickSample(pick);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) openFile(f);
  };

  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!onCanvasClick) return;
    const r = e.currentTarget.getBoundingClientRect();
    onCanvasClick({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };

  const btn =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {/* Toolbar */}
        <div className={`mb-3 flex flex-wrap items-center gap-2 ${source === "none" && !busy ? "hidden" : ""}`}>
          {webcam && (
            <button
              type="button"
              onClick={() => void startLive("webcam")}
              disabled={busy}
              className={`${btn} ${source === "webcam" ? "border-cyan bg-cyan/15 text-cyan" : "border-line-strong hover:border-text"}`}
            >
              <Camera className="size-4" aria-hidden="true" /> {t("webcam")}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className={`${btn} border-line-strong hover:border-text`}
          >
            <ImageUp className="size-4" aria-hidden="true" /> {t("uploadMedia")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) openFile(f);
              e.target.value = "";
            }}
          />
          {source !== "none" &&
            samples.map((s) => {
              const thumb = sampleThumb(s);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => void pickSample(s)}
                  disabled={busy}
                  className={`${btn} border-line py-1.5 pl-1.5 text-muted hover:border-line-strong hover:text-text`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-7 w-10 rounded object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-7 w-10 place-items-center rounded bg-panel-2">
                      <Images className="size-4" aria-hidden="true" />
                    </span>
                  )}
                  {t(`samples.${s.key}`)}
                </button>
              );
            })}
          {source === "video" && (
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) void v.play();
                else v.pause();
                setPaused(!v.paused);
              }}
              className={`${btn} border-line-strong hover:border-text`}
            >
              {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}{" "}
              {paused ? t("play") : t("pause")}
            </button>
          )}
          {live && (
            <button
              type="button"
              onClick={() => {
                stop();
                changeSource("none");
              }}
              className={`${btn} border-danger/50 text-danger hover:bg-danger/10`}
            >
              <Square className="size-4" aria-hidden="true" /> {t("stop")}
            </button>
          )}
          {source === "image" && (
            <button
              type="button"
              onClick={() => changeSource("none")}
              disabled={busy}
              className={`${btn} border-line-strong hover:border-text`}
            >
              <LayoutGrid className="size-4" aria-hidden="true" /> {t("allScenes")}
            </button>
          )}
        </div>

        {/* Stage */}
        <div
          className={`relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[20px] border bg-bg-2 sm:min-h-[420px] ${
            dragOver ? "border-cyan" : "border-line-strong"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <canvas
            ref={canvasRef}
            onClick={onClick}
            className={`block h-auto max-h-[70vh] w-auto max-w-full ${source === "none" ? "hidden" : ""} ${onCanvasClick ? "cursor-crosshair" : ""}`}
          />
          <video ref={videoRef} playsInline muted className="pointer-events-none absolute size-px opacity-0" />

          {source === "none" && !busy && (
            <div className="w-full p-4 sm:p-6">
              <p className="font-display text-xl font-bold">{t("pickScene")}</p>
              <p className="mt-1 text-sm text-muted">{t("pickSceneHint", { size })}</p>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {samples.map((s) => {
                  const thumb = sampleThumb(s);
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => void pickSample(s)}
                        className="group block w-full overflow-hidden rounded-lg border border-line bg-panel text-left transition-colors hover:border-cyan"
                      >
                        <span className="relative block aspect-video bg-panel-2">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
                          ) : (
                            <Images className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-dim" aria-hidden="true" />
                          )}
                          <span className="absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-cyan text-bg shadow-lg transition-transform group-hover:scale-110">
                            {s.kind === "video" ? <Play className="size-4 translate-x-px" aria-hidden="true" /> : <ScanSearch className="size-4" aria-hidden="true" />}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium">
                          {s.kind === "video" && <Film className="size-3.5 shrink-0 text-dim" aria-hidden="true" />}
                          <span className="truncate">{t(`samples.${s.key}`)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {webcam && (
                  <li>
                    <button
                      type="button"
                      onClick={() => void startLive("webcam")}
                      className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-3 text-sm font-medium text-muted transition-colors hover:border-cyan hover:text-text"
                    >
                      <Camera className="size-6 text-cyan" aria-hidden="true" />
                      {t("useWebcam")}
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-3 text-center text-sm font-medium text-muted transition-colors hover:border-cyan hover:text-text"
                  >
                    <Upload className="size-6 text-cyan" aria-hidden="true" />
                    {t("useOwnFile")}
                  </button>
                </li>
              </ul>
              <p className="mt-4 hidden text-xs text-dim sm:block">{t("dropHint")}</p>
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/70 backdrop-blur-sm" role="status">
              <Loader2 className="size-8 animate-spin text-cyan" aria-hidden="true" />
              <p className="text-sm">{model.state === "loading" ? t("downloading") : t("processing")}</p>
              {model.state === "loading" && (
                <>
                  <div className="h-1.5 w-56 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full bg-cyan transition-[width] ${model.progress == null ? "w-1/3 animate-pulse" : ""}`}
                      style={model.progress != null ? { width: `${Math.round(model.progress * 100)}%` } : undefined}
                    />
                  </div>
                  <p className="max-w-xs px-4 text-center text-xs text-dim">{t("firstLoad", { size })}</p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="absolute inset-x-3 bottom-3 flex items-start gap-3 rounded-xl border border-danger/40 bg-bg/95 p-4 text-sm" role="alert">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              <p className="flex-1">
                {error === "camera"
                  ? t("cameraDenied")
                  : error === "image"
                    ? t("imageFailed")
                    : error === "video"
                      ? t("videoFailed")
                      : t("modelFailed")}
              </p>
              {error !== "camera" && retryTarget && (
                <button
                  type="button"
                  onClick={() => (retryTarget.kind === "live" ? void startLive(retryTarget.input) : void loadStill(retryTarget.input))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 hover:border-text"
                >
                  <RotateCcw className="size-4" aria-hidden="true" /> {t("retry")}
                </button>
              )}
            </div>
          )}

          {live && fps > 0 && (
            <span className="tabular absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-bg/85 px-2 py-1 text-xs font-medium text-text">
              <span className="size-1.5 rounded-full bg-danger blink" aria-hidden="true" /> {source === "webcam" ? t("liveBadge") : t("videoBadge")}, {fps} {t("fps")}
            </span>
          )}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-dim">
          <ShieldCheck className="size-4 text-lime" aria-hidden="true" /> {c("privacy")}
        </p>
      </div>

      <aside className="min-w-0 space-y-4">{children}</aside>
    </div>
  );
}

/** Small titled panel for the right-hand column. */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel/60 p-5">
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

function sampleThumb(s: Sample): string | undefined {
  if (s.thumb) return s.thumb;
  return typeof s.url === "string" ? thumbFor(s.url) : undefined;
}
