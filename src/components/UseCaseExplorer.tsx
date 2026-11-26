"use client";

import { useState } from "react";
import { ArrowRight, Eye, Target, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type UseCaseCard = {
  id: string;
  industry: string;
  industryName: string;
  title: string;
  problem: string;
  how: string;
  kpi: string;
  effort: 1 | 2 | 3;
  effortLabel: string;
  demo?: { slug: string; title: string };
};

type Labels = { all: string; problem: string; how: string; kpi: string; tryDemo: string; count: string };

const effortStyle = { 1: "border-lime/50 text-lime", 2: "border-cyan/50 text-cyan", 3: "border-pink/50 text-pink" } as const;

/** Filterable grid of use cases; copy is translated on the server and passed in. */
export default function UseCaseExplorer({
  cases,
  industries,
  labels,
}: {
  cases: UseCaseCard[];
  industries: { id: string; name: string; count: number }[];
  labels: Labels;
}) {
  const [filter, setFilter] = useState<string>("all");
  const shown = filter === "all" ? cases : cases.filter((c) => c.industry === filter);
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
      active ? "border-cyan bg-cyan/15 text-cyan" : "border-line text-muted hover:border-line-strong hover:text-text"
    }`;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]" role="toolbar">
        <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={chip(filter === "all")}>
          {labels.all} · {cases.length}
        </button>
        {industries.map((i) => (
          <button key={i.id} type="button" onClick={() => setFilter(i.id)} aria-pressed={filter === i.id} className={chip(filter === i.id)}>
            {i.name} · {i.count}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-dim" aria-live="polite">{labels.count.replace("{n}", String(shown.length))}</p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id} id={c.id} className="bbox flex min-w-0 scroll-mt-24 flex-col rounded-xl border border-line bg-panel/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="tabular text-xs text-dim">{c.industryName}</span>
              <span className={`rounded-full border px-2 py-0.5 tabular text-xs ${effortStyle[c.effort]}`}>
                {c.effortLabel}
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold">{c.title}</h3>
            <dl className="mt-4 flex-1 space-y-3 text-sm">
              <div className="flex gap-2.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber" aria-label={labels.problem} />
                <dd className="text-muted">{c.problem}</dd>
              </div>
              <div className="flex gap-2.5">
                <Eye className="mt-0.5 size-4 shrink-0 text-cyan" aria-label={labels.how} />
                <dd>{c.how}</dd>
              </div>
              <div className="flex gap-2.5">
                <Target className="mt-0.5 size-4 shrink-0 text-lime" aria-label={labels.kpi} />
                <dd className="text-muted">
                  <span className="font-semibold text-text">{labels.kpi}: </span>
                  {c.kpi}
                </dd>
              </div>
            </dl>
            {c.demo && (
              <Link
                href={`/demos/${c.demo.slug}`}
                className="group mt-5 inline-flex items-center gap-1.5 border-t border-line pt-4 text-sm text-cyan hover:text-lime"
              >
                {labels.tryDemo}: {c.demo.title}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
