"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { EventLog, useEventLog } from "@/components/demo/EventLog";
import { useModel } from "@/lib/demo/useModel";
import { loadClip, zeroShot, type Clip } from "@/lib/demo/clip";
import { ConfirmGate } from "@/lib/demo/leftBehind";
import { videos } from "@/lib/content";

/** What CLIP compares each picture against. Plenty of ordinary scenes, so "fire" has to really stand out. */
const FIRE = ["a photo of fire", "a photo of flames", "a photo of a burning building"];
const SMOKE = ["a photo of thick smoke", "a photo of smoke rising from a fire"];
const NORMAL = [
  "a photo of a normal scene",
  "a photo of a sunset",
  "a photo of the sky",
  "a photo of a street",
  "a photo of a warehouse",
  "a photo of a factory",
  "a photo of a field",
  "a photo of a room",
  "a photo of people",
  "a photo of lights at night",
  "a photo of fog",
  "a photo of clouds",
];
const PROMPTS = [...FIRE, ...SMOKE, ...NORMAL];

type Check = { fire: number; smoke: number; tiles: { fire: number; smoke: number }[] };

/** Score the whole frame and its four quarters (a small fire in a corner is easier to see in a quarter). */
async function check(clip: Clip, input: CanvasImageSource & { width: number; height: number }): Promise<Check> {
  const crops: HTMLCanvasElement[] = [];
  const add = (sx: number, sy: number, sw: number, sh: number) => {
    const c = document.createElement("canvas");
    c.width = 224;
    c.height = 224;
    c.getContext("2d")!.drawImage(input, sx, sy, sw, sh, 0, 0, 224, 224);
    crops.push(c);
  };
  const { width: w, height: h } = input;
  add(0, 0, w, h);
  for (const [x, y] of [[0, 0], [w / 2, 0], [0, h / 2], [w / 2, h / 2]]) add(x, y, w / 2, h / 2);
  const [imgs, txt] = await Promise.all([clip.embedImages(crops), clip.embedTexts(PROMPTS)]);
  const scores = imgs.map((img) => {
    const p = zeroShot(img, txt);
    const sum = (from: number, n: number) => p.slice(from, from + n).reduce((a, b) => a + b, 0);
    return { fire: sum(0, FIRE.length), smoke: sum(FIRE.length, SMOKE.length) };
  });
  const tiles = scores.slice(1);
  return {
    fire: Math.max(...scores.map((s) => s.fire)),
    smoke: Math.max(...scores.map((s) => s.smoke)),
    tiles,
  };
}

function drawOverlay(ctx: CanvasRenderingContext2D, c: Check, threshold: number, alarm: boolean) {
  const { width: w, height: h } = ctx.canvas;
  const s = Math.max(1, w / 900);
  ctx.save();
  c.tiles.forEach((tile, i) => {
    const x = (i % 2) * (w / 2);
    const y = Math.floor(i / 2) * (h / 2);
    const hot = tile.fire >= threshold ? "fire" : tile.smoke >= threshold ? "smoke" : null;
    if (!hot) return;
    ctx.fillStyle = hot === "fire" ? "rgba(255,93,108,0.18)" : "rgba(165,179,200,0.22)";
    ctx.fillRect(x, y, w / 2, h / 2);
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = hot === "fire" ? "#ff5d6c" : "#a5b3c8";
    ctx.strokeRect(x + 2 * s, y + 2 * s, w / 2 - 4 * s, h / 2 - 4 * s);
  });
  if (alarm) {
    ctx.lineWidth = 8 * s;
    ctx.strokeStyle = "#ff5d6c";
    ctx.strokeRect(4 * s, 4 * s, w - 8 * s, h - 8 * s);
  }
  ctx.restore();
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function FireSmokeDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadClip);
  const [threshold, setThreshold] = useState(0.5);
  const [need, setNeed] = useState(4);
  const gate = useRef(new ConfirmGate(4, 6));
  const latest = useRef<Check | null>(null);
  const busy = useRef(false);
  const snap = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState({ fire: 0, smoke: 0, checks: 0, raw: 0, alarms: 0, on: false, ms: 0 });
  const log = useEventLog();

  const reset = () => {
    gate.current.reset();
    latest.current = null;
    setView({ fire: 0, smoke: 0, checks: 0, raw: 0, alarms: 0, on: false, ms: 0 });
  };

  const runCheck = (video: HTMLVideoElement) => {
    if (busy.current || !video.videoWidth) return;
    busy.current = true;
    const c = (snap.current ??= document.createElement("canvas"));
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")!.drawImage(video, 0, 0);
    const t0 = performance.now();
    check(model.get()!, c)
      .then((r) => {
        latest.current = r;
        const g = gate.current;
        g.need = need;
        const hit = Math.max(r.fire, r.smoke) >= threshold;
        const fired = g.push(hit);
        if (fired) log.add(t("fireAlarm"), `${t("fireLabel")} ${pct(r.fire)} · ${t("smokeLabel")} ${pct(r.smoke)}`, "alert");
        setView((v) => ({ fire: r.fire, smoke: r.smoke, checks: v.checks + 1, raw: g.rawHits, alarms: g.alarms, on: g.on, ms: performance.now() - t0 }));
      })
      .catch((e) => console.error("[demo] fire check failed", e))
      .finally(() => (busy.current = false));
  };

  const status = view.on ? "alarm" : Math.max(view.fire, view.smoke) >= threshold ? "suspect" : "clear";

  return (
    <DemoStage
      webcam
      autoStart={false}
      size="153 MB"
      model={model}
      samples={[
        { key: "fireSmokeVideo", url: videos.fireSmoke, kind: "video" },
        { key: "fireFieldVideo", url: videos.fireField, kind: "video" },
        { key: "sunsetVideo", url: videos.sunset, kind: "video" },
        { key: "warehouseVideo", url: videos.warehouse, kind: "video" },
      ]}
      onSourceChange={reset}
      onVideoFrame={(video, ctx) => {
        runCheck(video);
        if (latest.current) drawOverlay(ctx, latest.current, threshold, gate.current.on);
      }}
      onImage={async (input, ctx) => {
        const r = await check(model.get()!, input);
        latest.current = r;
        drawOverlay(ctx, r, threshold, false);
        setView({ fire: r.fire, smoke: r.smoke, checks: 1, raw: Math.max(r.fire, r.smoke) >= threshold ? 1 : 0, alarms: 0, on: false, ms: 0 });
      }}
      rerunKey={threshold}
    >
      <Panel title={t("fireStatus")}>
        <div
          role="status"
          className={`rounded-xl border p-3 font-semibold ${
            status === "alarm" ? "border-danger bg-danger/15 text-danger" : status === "suspect" ? "border-amber bg-amber/10 text-amber" : "border-lime/40 bg-lime/5 text-lime"
          }`}
        >
          {t(`fireStates.${status}`)}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted">{t("fireLabel")}</dt>
          <dd className="tabular text-right">{pct(view.fire)}</dd>
          <dt className="text-muted">{t("smokeLabel")}</dt>
          <dd className="tabular text-right">{pct(view.smoke)}</dd>
          <dt className="text-muted">{t("fireChecks")}</dt>
          <dd className="tabular text-right">{view.checks}</dd>
          <dt className="text-muted">{t("fireRaw")}</dt>
          <dd className="tabular text-right text-amber">{view.raw}</dd>
          <dt className="text-muted">{t("fireConfirmed")}</dt>
          <dd className={`tabular text-right ${view.alarms ? "text-danger" : "text-lime"}`}>{view.alarms}</dd>
        </dl>
        {view.ms > 0 && <p className="tabular mt-2 text-xs text-dim">{t("fireSpeed", { ms: Math.round(view.ms) })}</p>}
      </Panel>
      <Panel title={t("fireTuning")}>
        <label className="block text-sm">
          <span className="flex justify-between text-muted">
            {t("fireThreshold")} <span className="tabular text-text">{pct(threshold)}</span>
          </span>
          <input type="range" min={0.2} max={0.9} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <label className="mt-4 block text-sm">
          <span className="flex justify-between text-muted">
            {t("fireNeed")} <span className="tabular text-text">{t("fireNeedValue", { n: need, of: 6 })}</span>
          </span>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={need}
            onChange={(e) => {
              setNeed(Number(e.target.value));
              reset();
            }}
            className="mt-2 w-full"
          />
        </label>
        <p className="mt-3 text-xs text-dim">{t("fireNote")}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-text"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> {t("resetCount")}
        </button>
      </Panel>
      <EventLog events={log.events} onClear={log.clear} name="fire-smoke" />
    </DemoStage>
  );
}
