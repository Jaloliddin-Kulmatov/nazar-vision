"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { EventLog, useEventLog } from "@/components/demo/EventLog";
import { useModel } from "@/lib/demo/useModel";
import { setMode } from "@/lib/demo/mediapipe";
import { loadPose, type LoadedPose } from "@/lib/demo/pose";
import { CentroidTracker } from "@/lib/demo/tracker";
import { FALL_DEFAULTS, FallMonitor, isLying, type FallState, type PoseSample } from "@/lib/demo/fall";
import { videos } from "@/lib/content";

/** Torso angle, hip height and body box shape from MediaPipe's 33 landmarks. */
function measure(lm: NormalizedLandmark[], w: number, h: number): Omit<PoseSample, "t"> & { x: number; top: { x: number; y: number } } {
  const mid = (a: NormalizedLandmark, b: NormalizedLandmark) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const sh = mid(lm[11], lm[12]);
  const hip = mid(lm[23], lm[24]);
  // Angle in pixels, so a wide video doesn't make lying people look upright.
  const tilt = Math.abs((Math.atan2((sh.x - hip.x) * w, (hip.y - sh.y) * h) * 180) / Math.PI);
  const seen = lm.filter((p) => (p.visibility ?? 1) > 0.4);
  const pts = seen.length >= 6 ? seen : lm;
  const xs = pts.map((p) => p.x * w);
  const ys = pts.map((p) => p.y * h);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  return {
    // 0 standing, 90 lying, up to 180 head-down: anything past the "down" angle counts as down.
    tilt,
    hipY: hip.y,
    aspect: bh > 0 ? bw / bh : 0,
    x: hip.x,
    top: { x: Math.min(...xs), y: Math.min(...ys) },
  };
}

const COLORS: Record<FallState | "pending", string> = { upright: "#3ee0a0", pending: "#ff9f43", down: "#ff9f43", fallen: "#ff5d6c" };

type Person = { id: number; state: FallState | "pending"; downMs: number; tilt: number };

export default function FallDetectionDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadPose);
  const [lyingSec, setLyingSec] = useState(4);
  const tracker = useRef(new CentroidTracker(0.15, 20));
  const monitors = useRef(new Map<number, FallMonitor>());
  const [people, setPeople] = useState<Person[]>([]);
  const [alerts, setAlerts] = useState({ falls: 0, down: 0 });
  const last = useRef(0);
  const log = useEventLog();

  const reset = () => {
    tracker.current.reset();
    monitors.current.clear();
    setPeople([]);
    setAlerts({ falls: 0, down: 0 });
  };

  const drawPerson = (ctx: CanvasRenderingContext2D, m: LoadedPose, lm: NormalizedLandmark[], color: string, label: string, top: { x: number; y: number }) => {
    const du = new m.mp.DrawingUtils(ctx);
    const s = Math.max(1, ctx.canvas.width / 900);
    du.drawConnectors(lm, m.mp.PoseLandmarker.POSE_CONNECTIONS, { color, lineWidth: 4 * s });
    du.drawLandmarks(lm, { color, fillColor: "#0b1424", radius: 3 * s, lineWidth: 2 * s });
    ctx.save();
    ctx.font = `700 ${14 * s}px ui-sans-serif, system-ui`;
    const tw = ctx.measureText(label).width + 12 * s;
    const y = Math.max(0, top.y - 30 * s);
    ctx.fillStyle = color;
    ctx.fillRect(top.x, y, tw, 24 * s);
    ctx.fillStyle = "#0b1424";
    ctx.fillText(label, top.x + 6 * s, y + 17 * s);
    ctx.restore();
  };

  const stateLabel = (p: Person) =>
    p.state === "fallen" ? t("fallStates.fallen") : p.state === "down" ? t("fallStates.down") : p.state === "pending" ? `${t("fallStates.pending")} ${Math.round(p.downMs / 1000)} s` : t("fallStates.upright");

  return (
    <DemoStage
      webcam
      size="6 MB"
      model={model}
      samples={[
        { key: "manLyingVideo", url: videos.manLying, kind: "video" },
        { key: "personDownVideo", url: videos.personDown, kind: "video" },
        { key: "squatVideo", url: videos.squat, kind: "video" },
        { key: "workersVideo", url: videos.workers, kind: "video" },
      ]}
      prepare={async (mode) => setMode(model.get()!.task, mode === "video" ? "VIDEO" : "IMAGE")}
      onSourceChange={reset}
      onVideoFrame={(video, ctx, now) => {
        const m = model.get()!;
        const { width: w, height: h } = ctx.canvas;
        const poses = m.task.detectForVideo(video, now).landmarks;
        const measured = poses.map((lm) => measure(lm, w, h));
        const tracks = tracker.current.update(measured.map((p) => ({ x: p.x, y: p.hipY })), now);
        const list: Person[] = [];
        for (const tr of tracks) {
          if (tr.det < 0) continue;
          const p = measured[tr.det];
          let mon = monitors.current.get(tr.id);
          if (!mon) {
            mon = new FallMonitor({ ...FALL_DEFAULTS, lyingMs: lyingSec * 1000 });
            monitors.current.set(tr.id, mon);
          }
          const ev = mon.update({ t: now, tilt: p.tilt, hipY: p.hipY, aspect: p.aspect });
          if (ev === "fall") {
            log.add(t("fallEvent"), `#${tr.id}`, "alert");
            setAlerts((a) => ({ ...a, falls: a.falls + 1 }));
          } else if (ev === "lying") {
            log.add(t("downEvent"), t("downDetail", { id: tr.id, s: lyingSec }), "warn");
            setAlerts((a) => ({ ...a, down: a.down + 1 }));
          }
          const downMs = mon.downFor(now);
          const state: Person["state"] = mon.state === "upright" && downMs > 0 ? "pending" : mon.state;
          const person = { id: tr.id, state, downMs, tilt: Math.round(p.tilt) };
          list.push(person);
          drawPerson(ctx, m, poses[tr.det], COLORS[state], `#${tr.id} ${stateLabel(person)}`, p.top);
        }
        if (now - last.current > 250) {
          last.current = now;
          setPeople(list);
        }
      }}
      onImage={(input, ctx) => {
        const m = model.get()!;
        const { width: w, height: h } = ctx.canvas;
        const poses = m.task.detect(input).landmarks;
        const list = poses.map((lm, i) => {
          const p = measure(lm, w, h);
          const lying = isLying(p);
          const person: Person = { id: i + 1, state: lying ? "down" : "upright", downMs: 0, tilt: Math.round(p.tilt) };
          drawPerson(ctx, m, lm, COLORS[person.state], `#${person.id} ${stateLabel(person)}`, p.top);
          return person;
        });
        setPeople(list);
      }}
    >
      <Panel title={t("fallStatus")}>
        <div
          role="status"
          className={`rounded-xl border p-3 font-semibold ${
            people.some((p) => p.state === "fallen") ? "border-danger bg-danger/15 text-danger" : people.some((p) => p.state !== "upright") ? "border-amber bg-amber/10 text-amber" : "border-lime/40 bg-lime/5 text-lime"
          }`}
        >
          {people.some((p) => p.state === "fallen") ? t("fallBanner.fall") : people.some((p) => p.state !== "upright") ? t("fallBanner.down") : t("fallBanner.ok", { n: people.length })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          {[
            [t("fallCount"), alerts.falls],
            [t("downCount"), alerts.down],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className={`tabular font-display text-xl font-bold ${v ? "text-danger" : "text-cyan"}`}>{v}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        {people.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {people.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-bg-2 px-3 py-1.5">
                <span className="tabular text-dim">#{p.id}</span>
                <span className="tabular text-muted">{p.tilt}°</span>
                <span style={{ color: COLORS[p.state] }}>{stateLabel(p)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t("fallSettings")}>
        <label className="block text-sm">
          <span className="flex justify-between text-muted">
            {t("fallLying")} <span className="tabular text-text">{lyingSec} s</span>
          </span>
          <input
            type="range"
            min={2}
            max={15}
            step={1}
            value={lyingSec}
            onChange={(e) => {
              setLyingSec(Number(e.target.value));
              monitors.current.clear();
            }}
            className="mt-2 w-full"
          />
        </label>
        <p className="mt-3 text-sm text-muted">{t("fallTry")}</p>
        <p className="mt-2 text-xs text-dim">{t("fallNote")}</p>
      </Panel>
      <EventLog events={log.events} onClear={log.clear} name="fall-detection" />
    </DemoStage>
  );
}
