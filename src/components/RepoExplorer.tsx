"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Search, Star, Scale, Clock, Archive, ExternalLink, RotateCcw } from "lucide-react";
import {
  filterRepos, isStale, licenseClass, repoTasks,
  type Repo, type RepoFilter, type LicenseClass,
} from "@/lib/repos";

const licenseStyle: Record<LicenseClass, string> = {
  permissive: "border-lime/40 bg-lime/10 text-lime",
  copyleft: "border-amber/40 bg-amber/10 text-amber",
  unknown: "border-line-strong bg-panel-2 text-muted",
};

const initial: RepoFilter = { q: "", task: "all", commercialOnly: false, sort: "stars" };

export default function RepoExplorer({ repos }: { repos: Repo[] }) {
  const t = useTranslations("oss");
  const format = useFormatter();
  const [f, setF] = useState<RepoFilter>(initial);
  const list = useMemo(() => filterRepos(repos, f), [repos, f]);
  const now = useMemo(() => new Date(), []);
  const set = <K extends keyof RepoFilter>(k: K, v: RepoFilter[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div>
      {/* Controls */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-line bg-bg/90 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <span className="sr-only">{t("search")}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" aria-hidden="true" />
            <input
              type="search"
              value={f.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder={t("search")}
              className="field pl-9"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="sr-only sm:not-sr-only">{t("sort")}</span>
            <select value={f.sort} onChange={(e) => set("sort", e.target.value as RepoFilter["sort"])} className="field py-2.5">
              <option value="stars">{t("sortStars")}</option>
              <option value="updated">{t("sortUpdated")}</option>
              <option value="name">{t("sortName")}</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={f.commercialOnly}
              onChange={(e) => set("commercialOnly", e.target.checked)}
              className="size-4 accent-[var(--lime)]"
            />
            {t("commercialOnly")}
          </label>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(["all", ...repoTasks] as const).map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => set("task", task)}
              aria-pressed={f.task === task}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                f.task === task ? "border-cyan bg-cyan/15 text-cyan" : "border-line text-muted hover:border-line-strong hover:text-text"
              }`}
            >
              {task === "all" ? t("allTasks") : t(`tasks.${task}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 font-mono text-xs text-dim" aria-live="polite">
        {t("results", { count: list.length })}
      </p>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <p className="text-muted">{t("none")}</p>
          <button
            type="button"
            onClick={() => setF(initial)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2 text-sm hover:border-cyan hover:text-cyan"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> {t("reset")}
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const lc = licenseClass(r.license);
            const stale = isStale(r.pushedAt, now);
            return (
              <li key={r.name}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bbox group flex h-full flex-col rounded-xl border border-line bg-panel/70 p-4 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words font-mono text-sm">
                      <span className="text-dim">{r.name.split("/")[0]}/</span>
                      <span className="font-semibold text-text">{r.name.split("/")[1]}</span>
                    </p>
                    <ExternalLink className="size-4 shrink-0 text-dim group-hover:text-cyan" aria-hidden="true" />
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{r.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-text">
                      <Star className="size-3.5 text-amber" aria-hidden="true" />
                      {format.number(r.stars, { notation: "compact", maximumFractionDigits: 1 })}
                      <span className="sr-only"> {t("stars")}</span>
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${licenseStyle[lc]}`}
                      title={t(`license.${lc}`)}
                    >
                      <Scale className="size-3" aria-hidden="true" />
                      {r.license === "NOASSERTION" ? "Custom" : r.license === "NONE" ? "—" : r.license}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 text-dim">{t(`tasks.${r.task}`)}</span>
                    {r.archived ? (
                      <span className="flex items-center gap-1 rounded-full border border-danger/40 px-2 py-0.5 text-danger">
                        <Archive className="size-3" aria-hidden="true" /> {t("archived")}
                      </span>
                    ) : stale ? (
                      <span className="flex items-center gap-1 rounded-full border border-amber/40 px-2 py-0.5 text-amber">
                        <Clock className="size-3" aria-hidden="true" /> {t("stale")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-dim">
                    {t("lastPush")}: {format.dateTime(new Date(r.pushedAt), { year: "numeric", month: "short" })}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
