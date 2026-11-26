"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { FLORENCE_TASKS, loadFlorence, type FlorenceAnswer, type FlorenceTask } from "@/lib/demo/florence";
import { drawBox } from "@/lib/demo/image";
import { samples, videos } from "@/lib/content";

const TASKS = FLORENCE_TASKS;
type Task = FlorenceTask;
type Answer = FlorenceAnswer;

export default function SceneDescribeDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadFlorence);
  const [task, setTask] = useState<Task>("describe");
  const [query, setQuery] = useState("forklift");
  const [draft, setDraft] = useState("forklift");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const cache = useRef(new Map<string, Answer>());

  const draw = (ctx: CanvasRenderingContext2D, a: Answer) => {
    for (const b of a.boxes ?? []) {
      const [x1, y1, x2, y2] = b.box;
      drawBox(ctx, x1, y1, x2 - x1, y2 - y1, b.label);
    }
  };

  return (
    <DemoStage
      webcam={false}
      size="270 MB"
      model={model}
      maxSide={768}
      samples={[
        { key: "warehouseFrame", url: videos.warehouse, kind: "frame", at: 5 },
        { key: "workersFrame", url: videos.workers, kind: "frame", at: 6 },
        { key: "street", url: samples.street },
        { key: "invoice", url: samples.invoice },
      ]}
      onSourceChange={() => {
        cache.current.clear();
        setAnswer(null);
      }}
      onImage={async (input, ctx, imageId) => {
        const key = `${imageId}|${task}|${task === "find" ? query : ""}`;
        let a = cache.current.get(key);
        if (!a) {
          const t0 = performance.now();
          a = await model.get()!(input, task, query);
          setMs(performance.now() - t0);
          cache.current.set(key, a);
        }
        draw(ctx, a);
        setAnswer(a);
      }}
      rerunKey={`${task}|${query}`}
    >
      <Panel title={t("askTask")}>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TASKS) as Task[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTask(k)}
              aria-pressed={task === k}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${task === k ? "border-cyan bg-cyan/10 text-cyan" : "border-line-strong hover:border-text"}`}
            >
              {t(`askTasks.${k}`)}
            </button>
          ))}
        </div>
        {task === "find" && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setQuery(draft.trim() || "person");
            }}
          >
            <label className="sr-only" htmlFor="find-query">
              {t("askFindLabel")}
            </label>
            <input id="find-query" value={draft} onChange={(e) => setDraft(e.target.value)} className="field min-w-0 flex-1 text-sm" placeholder={t("askFindLabel")} />
            <button type="submit" className="grid size-11 shrink-0 place-items-center rounded-lg bg-cyan text-bg hover:bg-cyan-hi" aria-label={t("askFind")}>
              <Search className="size-4" aria-hidden="true" />
            </button>
          </form>
        )}
        <p className="mt-3 text-xs text-dim">{t("askNote")}</p>
      </Panel>
      <Panel title={t("results")}>
        {!answer ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : answer.text !== undefined ? (
          <p className="text-[15px] leading-relaxed">{answer.text || "—"}</p>
        ) : answer.boxes && answer.boxes.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(answer.boxes.reduce<Record<string, number>>((m, b) => ({ ...m, [b.label]: (m[b.label] ?? 0) + 1 }), {})).map(([label, n]) => (
              <li key={label} className="rounded-md border border-line px-2 py-1 text-sm">
                {label} <span className="tabular text-cyan">{n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("askNothing")}</p>
        )}
        {ms !== null && answer && <p className="tabular mt-3 text-xs text-dim">{t("askTime", { s: (ms / 1000).toFixed(1) })}</p>}
      </Panel>
    </DemoStage>
  );
}
