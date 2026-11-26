"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { HERO_STEP, heroFrames, heroLane } from "@/lib/heroDetections";
import { pointInPolygon } from "@/lib/demo/zone";

// SVG units: the clip is 16:9.
const W = 160;
const H = 90;
const lanePoints = heroLane.map((p) => `${p.x * W},${p.y * H}`).join(" ");

/**
 * The home page's opening shot: real warehouse footage with real person
 * detections (recorded from the model, synced to the video's clock) and a
 * forklift lane that turns red when someone steps into it.
 */
export default function HeroLive() {
  const t = useTranslations("home.live");
  const video = useRef<HTMLVideoElement>(null);
  const [idx, setIdx] = useState(15); // 3.0 s: the moment someone steps into the lane
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    const sync = () => {
      const i = Math.min(heroFrames.length - 1, Math.max(0, Math.round(v.currentTime / HERO_STEP)));
      setIdx((old) => (old === i ? old : i));
      raf = requestAnimationFrame(sync);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      v.currentTime = 3;
    } else {
      v.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().then(() => setPlaying(true));
    else {
      v.pause();
      setPlaying(false);
    }
  };

  const boxes = heroFrames[idx][1].map(([score, x, y, w, h]) => ({
    score,
    x,
    y,
    w,
    h,
    inLane: pointInPolygon({ x: x + w / 2, y: y + h }, heroLane),
  }));
  const alert = boxes.some((b) => b.inLane);

  return (
    <figure className="min-w-0">
      <div className="relative">
        <div className="relative aspect-video overflow-hidden rounded-[20px] border border-line-strong bg-bg-2">
          <video
            ref={video}
            src="/videos/warehouse.mp4"
            poster="/posters/warehouse.jpg"
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 size-full object-cover"
            aria-hidden="true"
          />
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
            <polygon
              points={lanePoints}
              fill={alert ? "rgba(255,93,108,0.28)" : "rgba(255,198,41,0.14)"}
              stroke={alert ? "#ff5d6c" : "#ffc629"}
              strokeWidth="0.5"
              strokeDasharray={alert ? undefined : "2 1.2"}
            />
            {boxes.map((b, i) => {
              const color = b.inLane ? "#ff5d6c" : "#ffc629";
              const label = `${t("person")} ${b.score}%`;
              const tagW = label.length * 1.55 + 3;
              return (
                <g key={i}>
                  <rect x={b.x * W} y={b.y * H} width={b.w * W} height={b.h * H} fill="none" stroke={color} strokeWidth="0.6" rx="0.4" />
                  <rect x={b.x * W - 0.3} y={b.y * H - 4.2} width={tagW} height="4.2" fill={color} rx="0.4" />
                  <text x={b.x * W + 1.2} y={b.y * H - 1.2} fontSize="2.8" fontWeight="600" fill="#0b1424">
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>

          <span className="absolute left-3 top-3 hidden items-center gap-1.5 rounded-md bg-bg/85 px-2.5 py-1.5 text-xs font-medium sm:left-4 sm:top-4 sm:flex">
            <span className={`size-1.5 rounded-full ${playing ? "bg-danger blink" : "bg-dim"}`} aria-hidden="true" />
            {t("badge")}
          </span>
        </div>
        {/* Readouts */}
        <div className="mt-3 flex items-center justify-between gap-2 sm:absolute sm:inset-x-4 sm:bottom-4 sm:mt-0 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <span className="tabular rounded-md bg-panel px-2.5 py-1.5 text-xs font-medium sm:bg-bg/85 sm:text-sm">
              {t("people", { n: boxes.length })}
            </span>
            <span
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold sm:text-sm ${alert ? "bg-danger text-bg" : "bg-panel text-lime sm:bg-bg/85"}`}
            >
              {alert ? t("alert") : t("clear")}
            </span>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="grid size-9 shrink-0 place-items-center rounded-md bg-panel text-text hover:bg-panel-2 sm:bg-bg/85"
            aria-label={playing ? t("pause") : t("play")}
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-dim">{t("caption")}</figcaption>
    </figure>
  );
}
