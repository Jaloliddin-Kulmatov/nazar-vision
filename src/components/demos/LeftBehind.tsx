"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { EventLog, useEventLog } from "@/components/demo/EventLog";
import { useModel } from "@/lib/demo/useModel";
import { mediapipeDetector, type Det } from "@/lib/demo/detectors";
import { drawBox } from "@/lib/demo/image";
import { CentroidTracker } from "@/lib/demo/tracker";
import { LEFT_DEFAULTS, LeftBehindMonitor, near, type BagStatus, type Box } from "@/lib/demo/leftBehind";
import { videos } from "@/lib/content";

const BAGS = ["backpack", "handbag", "suitcase"];
const loadDetector = mediapipeDetector({ allow: ["person", ...BAGS], minScore: 0.3 });

const COLORS: Record<BagStatus, string> = { moving: "#a5b3c8", attended: "#3ee0a0", unattended: "#ff9f43", alert: "#ff5d6c" };

const norm = (d: Det, w: number, h: number): Box => ({ x: d.x / w, y: d.y / h, w: d.w / w, h: d.h / h });

export default function LeftBehindDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadDetector);
  const [limit, setLimit] = useState(5);
  const tracker = useRef(new CentroidTracker(0.08, 30));
  const monitor = useRef(new LeftBehindMonitor({ ...LEFT_DEFAULTS, alertMs: 5000 }));
  const [view, setView] = useState({ bags: 0, people: 0, alone: 0, alerts: 0 });
  const last = useRef(0);
  const log = useEventLog();

  const reset = () => {
    tracker.current.reset();
    monitor.current.reset();
    setView({ bags: 0, people: 0, alone: 0, alerts: 0 });
  };

  const label = (status: BagStatus, ms: number) =>
    status === "alert" ? t("leftStates.alert") : status === "unattended" ? `${t("leftStates.unattended")} ${Math.floor(ms / 1000)} s` : t(`leftStates.${status}`);

  return (
    <DemoStage
      webcam
      size="7 MB"
      model={model}
      samples={[
        { key: "luggageFloorVideo", url: videos.luggageFloor, kind: "video" },
        { key: "luggageOwnerVideo", url: videos.luggageOwner, kind: "video" },
        { key: "suitcasePlatformVideo", url: videos.suitcasePlatform, kind: "video" },
      ]}
      prepare={(mode) => model.get()!.prepare(mode)}
      onSourceChange={reset}
      onVideoFrame={(video, ctx, now) => {
        const { width: w, height: h } = ctx.canvas;
        const dets = model.get()!.detectFrame(video, now);
        const people = dets.filter((d) => d.name === "person");
        const bags = dets.filter((d) => BAGS.includes(d.name));
        const tracks = tracker.current.update(bags.map((d) => ({ x: (d.x + d.w / 2) / w, y: (d.y + d.h / 2) / h })), now);
        monitor.current.o.alertMs = limit * 1000;
        const seen = tracks.filter((tr) => tr.det >= 0);
        const { states, fired } = monitor.current.update(
          seen.map((tr) => ({ id: tr.id, box: norm(bags[tr.det], w, h) })),
          people.map((d) => norm(d, w, h)),
          now,
        );
        for (const id of fired) log.add(t("leftEvent"), t("leftDetail", { id, s: limit }), "alert");
        for (const p of people) drawBox(ctx, p.x, p.y, p.w, p.h, "person", "#6cb6ff");
        seen.forEach((tr, i) => {
          const d = bags[tr.det];
          const st = states[i];
          drawBox(ctx, d.x, d.y, d.w, d.h, `${d.name} · ${label(st.status, st.aloneMs)}`, COLORS[st.status]);
        });
        if (now - last.current > 250) {
          last.current = now;
          setView({ bags: seen.length, people: people.length, alone: states.filter((s) => s.status === "unattended" || s.status === "alert").length, alerts: monitor.current.alerts });
        }
      }}
      onImage={async (input, ctx) => {
        const { width: w, height: h } = ctx.canvas;
        const dets = await model.get()!.detectImage(input);
        const people = dets.filter((d) => d.name === "person");
        const bags = dets.filter((d) => BAGS.includes(d.name));
        for (const p of people) drawBox(ctx, p.x, p.y, p.w, p.h, "person", "#6cb6ff");
        let alone = 0;
        for (const b of bags) {
          const withSomeone = people.some((p) => near(norm(p, w, h), norm(b, w, h), LEFT_DEFAULTS.reach));
          if (!withSomeone) alone++;
          drawBox(ctx, b.x, b.y, b.w, b.h, `${b.name} · ${t(withSomeone ? "leftStates.attended" : "leftStates.noOwner")}`, withSomeone ? COLORS.attended : COLORS.unattended);
        }
        setView({ bags: bags.length, people: people.length, alone, alerts: 0 });
      }}
    >
      <Panel title={t("leftStatus")}>
        <div
          role="status"
          className={`rounded-xl border p-3 font-semibold ${view.alerts ? "border-danger bg-danger/15 text-danger" : view.alone ? "border-amber bg-amber/10 text-amber" : "border-lime/40 bg-lime/5 text-lime"}`}
        >
          {view.alerts ? t("leftBanner.alert", { n: view.alerts }) : view.alone ? t("leftBanner.watch", { n: view.alone }) : t("leftBanner.ok")}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [t("leftBags"), view.bags],
            [t("leftPeople"), view.people],
            [t("leftAlerts"), view.alerts],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-line bg-bg-2 p-3">
              <p className="tabular font-display text-xl font-bold text-cyan">{v}</p>
              <p className="mt-1 text-xs text-muted">{l}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={t("leftSettings")}>
        <label className="block text-sm">
          <span className="flex justify-between text-muted">
            {t("leftLimit")} <span className="tabular text-text">{limit} s</span>
          </span>
          <input type="range" min={3} max={30} step={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {(["moving", "attended", "unattended", "alert"] as BagStatus[]).map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: COLORS[s] }} aria-hidden="true" /> {t(`leftLegend.${s}`)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-dim">{t("leftNote")}</p>
      </Panel>
      <EventLog events={log.events} onClear={log.clear} name="left-behind" />
    </DemoStage>
  );
}
