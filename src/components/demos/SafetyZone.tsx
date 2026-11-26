"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Siren } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { EventLog, useEventLog } from "@/components/demo/EventLog";
import { useModel } from "@/lib/demo/useModel";
import { mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox } from "@/lib/demo/image";
import { pointInPolygon, ZoneMonitor, type Pt, type ZoneState } from "@/lib/demo/zone";
import { samples, videos } from "@/lib/content";

const loadPeople = mediapipeDetector({ allow: ["person"], minScore: 0.35 });

/** A floor area in front of the racks in the warehouse sample; users can redraw it with 4 clicks. */
const DEFAULT_ZONE: Pt[] = [
  { x: 0.42, y: 0.5 },
  { x: 0.8, y: 0.5 },
  { x: 0.92, y: 0.95 },
  { x: 0.3, y: 0.95 },
];

function drawZone(ctx: CanvasRenderingContext2D, zone: Pt[], alert: boolean, draft: Pt[]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const s = Math.max(1, w / 900);
  ctx.save();
  if (zone.length >= 3) {
    ctx.beginPath();
    zone.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)));
    ctx.closePath();
    ctx.fillStyle = alert ? "rgba(255, 92, 122, 0.32)" : "rgba(255, 181, 71, 0.16)";
    ctx.fill();
    ctx.lineWidth = 3 * s;
    ctx.setLineDash(alert ? [] : [12 * s, 8 * s]);
    ctx.strokeStyle = alert ? "#ff5d6c" : "#ff9f43";
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffc629";
  for (const p of draft) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (alert) {
    const label = "⚠ ZONE BREACH";
    ctx.font = `800 ${18 * s}px ui-monospace, monospace`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "#ff5d6c";
    ctx.fillRect(w / 2 - tw / 2 - 12 * s, 12 * s, tw + 24 * s, 32 * s);
    ctx.fillStyle = "#0b1424";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, 28 * s);
  }
  ctx.restore();
}

export default function SafetyZoneDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadPeople);
  const monitor = useRef(new ZoneMonitor(600));
  const [zone, setZone] = useState<Pt[]>(DEFAULT_ZONE);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [state, setState] = useState<ZoneState>({ inside: 0, alert: false, events: 0, occupiedMs: 0 });
  const [people, setPeople] = useState(0);
  const last = useRef(0);
  const log = useEventLog();
  const logged = useRef(0);

  const process = (ctx: CanvasRenderingContext2D, dets: Det[], now: number | null) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const feet = dets.map((d) => ({ x: (d.x + d.w / 2) / w, y: (d.y + d.h * 0.95) / h }));
    const zs = now === null
      ? { inside: feet.filter((p) => pointInPolygon(p, zone)).length, alert: false, events: 0, occupiedMs: 0 }
      : monitor.current.update(feet, zone, now);
    const alert = zs.inside > 0;
    drawZone(ctx, zone, alert, draft);
    dets.forEach((d, i) => {
      const inZone = pointInPolygon(feet[i], zone);
      drawBox(ctx, d.x, d.y, d.w, d.h, `person ${Math.round(d.score * 100)}%`, inZone ? "#ff5d6c" : "#3ee0a0");
    });
    return { ...zs, alert, events: now === null ? (alert ? 1 : 0) : zs.events, people: dets.length };
  };

  const reset = () => {
    monitor.current.reset();
    logged.current = 0;
    setState({ inside: 0, alert: false, events: 0, occupiedMs: 0 });
  };

  return (
    <DemoStage
      webcam
      size="7 MB"
      model={model}
      samples={[
        { key: "warehouseVideo", url: videos.warehouse, kind: "video" },
        { key: "workersVideo", url: videos.workers, kind: "video" },
        { key: "street", url: samples.street },
      ]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onSourceChange={reset}
      onVideoFrame={(video, ctx, now) => {
        const r = process(ctx, model.get()!.detectFrame(video, now), now);
        if (now - last.current > 200) {
          last.current = now;
          for (let i = logged.current; i < r.events; i++) log.add(t("evZoneEntry"), t("evZoneDetail", { n: r.inside }), "alert");
          logged.current = r.events;
          setState(r);
          setPeople(r.people);
        }
      }}
      onImage={async (input, ctx) => {
        const r = process(ctx, await model.get()!.detectImage(input), null);
        setState(r);
        setPeople(r.people);
      }}
      rerunKey={`${JSON.stringify(zone)}-${draft.length}`}
      onCanvasClick={(p) => {
        const next = [...draft, p];
        if (next.length < 4) return setDraft(next);
        setZone(next);
        setDraft([]);
        reset();
      }}
    >
      <Panel title={t("zoneStatus")}>
        <div
          className={`flex items-center gap-3 rounded-xl border p-3 ${
            state.alert ? "border-danger bg-danger/15 text-danger" : "border-lime/40 bg-lime/5 text-lime"
          }`}
          role="status"
        >
          <Siren className={`size-5 ${state.alert ? "blink" : ""}`} aria-hidden="true" />
          <span className="font-semibold">{state.alert ? t("zoneAlert") : t("zoneClear")}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [t("inView"), people, "text-cyan"],
            [t("inZone"), state.inside, state.inside ? "text-danger" : "text-text"],
            [t("breaches"), state.events, "text-amber"],
          ].map(([label, v, color]) => (
            <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className={`font-display text-2xl font-bold ${color}`}>{v}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        {state.alert && state.occupiedMs > 0 && (
          <p className="mt-3 tabular text-xs text-danger">
            {t("occupiedFor", { s: (state.occupiedMs / 1000).toFixed(1) })}
          </p>
        )}
      </Panel>
      <Panel title={t("zone")}>
        <p className="text-sm text-muted">
          {draft.length ? t("zoneDrawing", { n: 4 - draft.length }) : t("zoneHint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setZone(DEFAULT_ZONE);
              setDraft([]);
              reset();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-cyan hover:text-cyan"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> {t("zoneReset")}
          </button>
        </div>
      </Panel>
      <EventLog events={log.events} onClear={log.clear} name="safety-zone" />
    </DemoStage>
  );
}
