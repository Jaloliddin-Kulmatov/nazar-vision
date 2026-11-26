"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Trash2 } from "lucide-react";
import { Panel } from "@/components/demo/DemoStage";
import { toCsvText } from "@/lib/csv";

export type DemoEvent = { at: number; kind: string; detail: string; tone?: "info" | "warn" | "alert" };

/** A running list of what a demo noticed (newest first), kept in memory only. */
export function useEventLog(max = 500) {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const add = useCallback(
    (kind: string, detail: string, tone: DemoEvent["tone"] = "info") =>
      setEvents((prev) => [{ at: Date.now(), kind, detail, tone }, ...prev].slice(0, max)),
    [max],
  );
  const clear = useCallback(() => setEvents([]), []);
  return { events, add, clear };
}

const toneClass = { info: "bg-cyan", warn: "bg-amber", alert: "bg-danger" } as const;

/** The event list with a CSV download: the "report instead of hours of footage" every client asks for. */
export function EventLog({ events, onClear, name }: { events: DemoEvent[]; onClear: () => void; name: string }) {
  const t = useTranslations("demos.ui");

  const download = () => {
    const csv = toCsvText(
      ["time", "event", "detail"],
      [...events].reverse().map((e) => [new Date(e.at).toISOString(), e.kind, e.detail]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-events.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Panel title={t("eventLog", { n: events.length })}>
      {events.length === 0 ? (
        <p className="text-sm text-muted">{t("eventLogEmpty")}</p>
      ) : (
        <ol className="max-h-48 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-live="polite">
          {events.slice(0, 50).map((e) => (
            <li key={`${e.at}-${e.kind}-${e.detail}`} className="flex items-start gap-2">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${toneClass[e.tone ?? "info"]}`} aria-hidden="true" />
              <span className="tabular shrink-0 text-dim">{new Date(e.at).toLocaleTimeString([], { hour12: false })}</span>
              <span className="min-w-0">
                <span className="font-medium">{e.kind}</span> <span className="text-muted">{e.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={download}
          disabled={events.length === 0}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-bg hover:bg-cyan-hi disabled:opacity-40"
        >
          <Download className="size-4" aria-hidden="true" /> {t("eventLogCsv")}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={events.length === 0}
          aria-label={t("eventLogClear")}
          className="grid size-10 place-items-center rounded-lg border border-line-strong hover:border-text disabled:opacity-40"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-xs text-dim">{t("eventLogNote")}</p>
    </Panel>
  );
}
