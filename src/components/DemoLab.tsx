"use client";

import { useState } from "react";
import { DemoCard, type DemoCardData, type DemoCardLabels } from "./DemoCard";

type Item = DemoCardData & { group: string };

/** The Demo Lab grid with a filter by job (safety, counting, quality…). */
export default function DemoLab({
  items,
  groups,
  labels,
  allLabel,
}: {
  items: Item[];
  groups: { id: string; label: string }[];
  labels: DemoCardLabels;
  allLabel: string;
}) {
  const [group, setGroup] = useState<string | null>(null);
  const shown = group ? items.filter((i) => i.group === group) : items;
  const chip = (active: boolean) =>
    `min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
      active ? "border-cyan bg-cyan text-bg" : "border-line-strong text-muted hover:border-text hover:text-text"
    }`;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={allLabel}>
        <button type="button" className={chip(group === null)} aria-pressed={group === null} onClick={() => setGroup(null)}>
          {allLabel} <span className="tabular opacity-70">{items.length}</span>
        </button>
        {groups.map((g) => {
          const n = items.filter((i) => i.group === g.id).length;
          return (
            <button key={g.id} type="button" className={chip(group === g.id)} aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
              {g.label} <span className="tabular opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((d) => (
          <DemoCard key={d.slug} d={d} labels={labels} />
        ))}
      </div>
    </>
  );
}
