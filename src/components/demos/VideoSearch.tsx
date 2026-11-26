"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Film, Loader2, Play, Search, ShieldCheck, Upload } from "lucide-react";
import { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { dot, loadClip, type Clip } from "@/lib/demo/clip";
import { posterFor, videos } from "@/lib/content";
import { demoFromPath, track } from "@/lib/track";

type Scene = { key: string; url: string; queries: string[] };
const SCENES: Scene[] = [
  { key: "trafficVideo", url: videos.traffic, queries: ["a red bus", "a white van", "people crossing the street", "a motorbike"] },
  { key: "warehouseVideo", url: videos.warehouse, queries: ["a forklift", "a person carrying a box", "shelves full of boxes"] },
  { key: "crowdVideo", url: videos.crowd, queries: ["a person with a backpack", "a woman in a red coat", "a crowd of people"] },
  { key: "fireSmokeVideo", url: videos.fireSmoke, queries: ["a fire truck", "thick smoke", "flames"] },
];

type Frame = { t: number; embed: number[]; thumb: string };
type Hit = { t: number; score: number; thumb: string };

const MAX_FRAMES = 60;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function seek(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => reject(new Error("seek_failed"));
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.currentTime = t;
  });
}

/** Sample the video every second or so and embed each frame with CLIP. */
async function indexVideo(clip: Clip, src: string, onProgress: (f: number) => void, cancelled: () => boolean): Promise<{ frames: Frame[]; ms: number }> {
  const started = performance.now();
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("video_failed"));
  });
  const duration = video.duration || 0;
  const step = Math.max(0.5, duration / MAX_FRAMES);
  const times: number[] = [];
  for (let t = Math.min(0.2, duration / 2); t < duration; t += step) times.push(t);

  const w = 320;
  const h = Math.round((w * video.videoHeight) / video.videoWidth) || 180;
  const frames: Frame[] = [];
  const batch: { t: number; canvas: HTMLCanvasElement }[] = [];
  const flush = async () => {
    if (!batch.length) return;
    const embeds = await clip.embedImages(batch.map((b) => b.canvas));
    batch.forEach((b, i) => frames.push({ t: b.t, embed: embeds[i], thumb: b.canvas.toDataURL("image/jpeg", 0.6) }));
    batch.length = 0;
  };
  for (const [i, t] of times.entries()) {
    if (cancelled()) break;
    await seek(video, t);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(video, 0, 0, w, h);
    batch.push({ t, canvas: c });
    if (batch.length === 6) await flush();
    onProgress((i + 1) / times.length);
  }
  await flush();
  video.removeAttribute("src");
  video.load();
  return { frames, ms: performance.now() - started };
}

/** Best moments for a query: highest-scoring frames at least two seconds apart. */
function topMoments(frames: Frame[], scores: number[], n = 4): Hit[] {
  const order = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]);
  const out: Hit[] = [];
  for (const [s, i] of order) {
    if (out.some((h) => Math.abs(h.t - frames[i].t) < 2)) continue;
    out.push({ t: frames[i].t, score: s, thumb: frames[i].thumb });
    if (out.length === n) break;
  }
  return out;
}

export default function VideoSearchDemo() {
  const t = useTranslations("demos.ui");
  const c = useTranslations("common");
  const model = useModel(loadClip);
  const player = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const run = useRef(0);
  const [scene, setScene] = useState<Scene | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [indexing, setIndexing] = useState<number | null>(null);
  const [error, setError] = useState<null | "model" | "video">(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [scores, setScores] = useState<number[]>([]);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const open = async (url: string, sc: Scene | null, source: string) => {
    track("demo_run", { demo: demoFromPath(), source });
    const id = ++run.current;
    setScene(sc);
    setSrc(url);
    setFrames([]);
    setScores([]);
    setError(null);
    setIndexing(0);
    const first = sc?.queries[0] ?? "";
    setDraft(first);
    setQuery(first);
    let clip: Clip;
    try {
      clip = await model.load();
    } catch {
      setIndexing(null);
      return setError("model");
    }
    try {
      const { frames: f, ms: took } = await indexVideo(clip, url, (p) => run.current === id && setIndexing(p), () => run.current !== id);
      if (run.current !== id) return;
      setMs(took);
      setFrames(f);
    } catch (e) {
      console.error("[demo] indexing failed", e);
      if (run.current === id) setError("video");
    }
    if (run.current === id) setIndexing(null);
  };

  // Score every indexed frame against the query whenever either changes.
  // (Depends on the stable getter, not the hook's result object, which is new on every render.)
  const getClip = model.get;
  useEffect(() => {
    if (!frames.length || !query.trim()) return;
    let live = true;
    const clip = getClip();
    if (!clip) return;
    void clip.embedTexts([`a photo of ${query.trim()}`]).then(([q]) => {
      if (live) setScores(frames.map((f) => dot(f.embed, q)));
    });
    return () => {
      live = false;
    };
  }, [frames, query, getClip]);

  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 1;
  const rel = (s: number) => (max > min ? (s - min) / (max - min) : 0);
  const hits = frames.length && scores.length ? topMoments(frames, scores) : [];
  const duration = frames.length ? frames[frames.length - 1].t + 0.5 : 1;

  const jump = (time: number) => {
    const v = player.current;
    if (!v) return;
    v.currentTime = time;
    void v.play().catch(() => {});
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(draft.trim());
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {!src ? (
          <div className="rounded-[20px] border border-line-strong bg-bg-2 p-4 sm:p-6">
            <p className="font-display text-xl font-bold">{t("pickScene")}</p>
            <p className="mt-1 text-sm text-muted">{t("searchPickHint")}</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SCENES.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => void open(s.url, s, "sample")}
                    className="group block w-full overflow-hidden rounded-lg border border-line bg-panel text-left transition-colors hover:border-cyan"
                  >
                    <span className="relative block aspect-video bg-panel-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={posterFor(s.url)} alt="" className="size-full object-cover" loading="lazy" />
                      <span className="absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-cyan text-bg shadow-lg transition-transform group-hover:scale-110">
                        <Search className="size-4" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium">
                      <Film className="size-3.5 shrink-0 text-dim" aria-hidden="true" />
                      <span className="truncate">{t(`samples.${s.key}`)}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-3 text-center text-sm font-medium text-muted transition-colors hover:border-cyan hover:text-text"
                >
                  <Upload className="size-6 text-cyan" aria-hidden="true" />
                  {t("searchOwnVideo")}
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {SCENES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  disabled={indexing !== null}
                  onClick={() => void open(s.url, s, "sample")}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${scene?.key === s.key ? "border-cyan bg-cyan/10 text-cyan" : "border-line text-muted hover:border-line-strong hover:text-text"}`}
                >
                  {t(`samples.${s.key}`)}
                </button>
              ))}
              <button
                type="button"
                disabled={indexing !== null}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-text disabled:opacity-50"
              >
                <Upload className="size-4" aria-hidden="true" /> {t("searchOwnVideo")}
              </button>
            </div>
            <div className="relative overflow-hidden rounded-[20px] border border-line-strong bg-bg-2">
              <video ref={player} src={src} controls muted playsInline className="block max-h-[60vh] w-full bg-black" />
              {indexing !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/75 backdrop-blur-sm" role="status">
                  <Loader2 className="size-8 animate-spin text-cyan" aria-hidden="true" />
                  <p className="text-sm">{model.state === "loading" ? t("downloading") : t("searchIndexing", { p: Math.round(indexing * 100) })}</p>
                  <div className="h-1.5 w-56 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-cyan transition-[width]"
                      style={{ width: `${Math.round((model.state === "loading" ? (model.progress ?? 0.1) : indexing) * 100)}%` }}
                    />
                  </div>
                  {model.state === "loading" && <p className="max-w-xs px-4 text-center text-xs text-dim">{t("firstLoad", { size: "153 MB" })}</p>}
                </div>
              )}
              {error && (
                <div className="absolute inset-x-3 bottom-3 flex items-start gap-3 rounded-xl border border-danger/40 bg-bg/95 p-4 text-sm" role="alert">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                  <p>{error === "model" ? t("modelFailed") : t("videoFailed")}</p>
                </div>
              )}
            </div>
            {frames.length > 0 && scores.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-dim">{t("searchTimeline")}</p>
                <div className="flex h-16 items-end gap-px rounded-lg border border-line bg-bg-2 p-1.5" role="list" aria-label={t("searchTimeline")}>
                  {frames.map((f, i) => {
                    const r = rel(scores[i]);
                    const top = hits.some((h) => h.t === f.t);
                    return (
                      <button
                        key={f.t}
                        type="button"
                        role="listitem"
                        onClick={() => jump(f.t)}
                        title={`${fmt(f.t)} · ${Math.round(r * 100)}%`}
                        aria-label={`${fmt(f.t)}, ${Math.round(r * 100)}%`}
                        className={`min-w-0 flex-1 rounded-sm transition-colors ${top ? "bg-lime" : "bg-cyan/50 hover:bg-cyan"}`}
                        style={{ height: `${Math.max(6, r * 100)}%` }}
                      />
                    );
                  })}
                </div>
                <div className="tabular mt-1 flex justify-between text-xs text-dim">
                  <span>0:00</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>
            )}
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
            objectUrl.current = URL.createObjectURL(f);
            void open(objectUrl.current, null, "upload");
          }}
        />
        <p className="mt-3 flex items-center gap-2 text-xs text-dim">
          <ShieldCheck className="size-4 text-lime" aria-hidden="true" /> {c("privacy")}
        </p>
      </div>

      <aside className="min-w-0 space-y-4">
        <Panel title={t("searchAsk")}>
          <form onSubmit={submit} className="flex gap-2">
            <label className="sr-only" htmlFor="video-query">
              {t("searchAsk")}
            </label>
            <input
              id="video-query"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("searchPlaceholder")}
              disabled={!frames.length}
              className="field min-w-0 flex-1 text-sm"
            />
            <button type="submit" disabled={!frames.length} className="grid size-11 shrink-0 place-items-center rounded-lg bg-cyan text-bg hover:bg-cyan-hi disabled:opacity-40" aria-label={t("searchAsk")}>
              <Search className="size-4" aria-hidden="true" />
            </button>
          </form>
          {scene && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {scene.queries.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!frames.length}
                  onClick={() => {
                    setDraft(q);
                    setQuery(q);
                  }}
                  className={`rounded-md border px-2 py-1 text-xs disabled:opacity-40 ${query === q ? "border-cyan text-cyan" : "border-line text-muted hover:border-line-strong hover:text-text"}`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-dim">{t("searchNote")}</p>
        </Panel>
        <Panel title={t("searchMoments")}>
          {!hits.length ? (
            <p className="text-sm text-muted">{frames.length ? t("searchEmpty") : t("noResults")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {hits.map((h) => (
                <li key={h.t}>
                  <button type="button" onClick={() => jump(h.t)} className="group block w-full overflow-hidden rounded-lg border border-line text-left hover:border-cyan">
                    <span className="relative block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.thumb} alt="" className="aspect-video w-full object-cover" />
                      <span className="absolute bottom-1 left-1 grid size-6 place-items-center rounded-full bg-cyan text-bg">
                        <Play className="size-3 translate-x-px" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="tabular flex justify-between px-2 py-1 text-xs">
                      <span>{fmt(h.t)}</span>
                      <span className="text-lime">{Math.round(rel(h.score) * 100)}%</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {frames.length > 0 && ms !== null && <p className="tabular mt-3 text-xs text-dim">{t("searchIndexed", { n: frames.length, s: (ms / 1000).toFixed(1) })}</p>}
        </Panel>
      </aside>
    </div>
  );
}
