"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { estimateRoi, type RoiInput } from "@/lib/roi";
import { ButtonLink } from "@/components/ui";

type Field = { key: keyof RoiInput; min: number; max: number; step: number; pct?: boolean; money?: boolean };

const fields: Field[] = [
  { key: "inspectors", min: 0, max: 30, step: 1 },
  { key: "shifts", min: 1, max: 3, step: 1 },
  { key: "monthlyCost", min: 100, max: 3000, step: 50, money: true },
  { key: "automated", min: 0, max: 1, step: 0.05, pct: true },
  { key: "escapes", min: 0, max: 500, step: 5 },
  { key: "escapeCost", min: 0, max: 2000, step: 10, money: true },
  { key: "caught", min: 0, max: 1, step: 0.05, pct: true },
  { key: "projectCost", min: 1000, max: 100000, step: 500, money: true },
  { key: "runningCost", min: 0, max: 2000, step: 25, money: true },
];

const DEFAULTS: RoiInput = {
  inspectors: 4,
  shifts: 2,
  monthlyCost: 450,
  automated: 0.5,
  escapes: 20,
  escapeCost: 60,
  caught: 0.5,
  // An example one-off budget for a single line or site, including cameras and an edge computer.
  projectCost: 9000,
  runningCost: 150,
};

const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

export default function RoiCalculator() {
  const t = useTranslations("services.roi");
  const [v, setV] = useState<RoiInput>(DEFAULTS);
  const r = estimateRoi(v);
  const show = (f: Field, x: number) => (f.pct ? `${Math.round(x * 100)}%` : f.money ? usd(x) : String(x));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="grid gap-x-6 gap-y-5 rounded-xl border border-line bg-panel/60 p-6 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-muted">{t(`fields.${f.key}`)}</span>
              <span className="shrink-0 tabular text-cyan">{show(f, v[f.key])}</span>
            </span>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={v[f.key]}
              onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })}
              className="mt-2 w-full"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-col rounded-xl border border-cyan bg-panel p-6" aria-live="polite">
        <p className="text-sm text-muted">{t("monthly")}</p>
        <p className={`font-display text-4xl font-bold ${r.monthly > 0 ? "text-lime" : "text-danger"}`}>{usd(r.monthly)}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted">{t("labour")}</dt>
          <dd className="text-right tabular">{usd(r.labourSaving)}</dd>
          <dt className="text-muted">{t("quality")}</dt>
          <dd className="text-right tabular">{usd(r.qualitySaving)}</dd>
          <dt className="text-muted">{t("firstYear")}</dt>
          <dd className={`text-right tabular ${r.firstYear >= 0 ? "text-lime" : "text-danger"}`}>{usd(r.firstYear)}</dd>
          <dt className="text-muted">{t("payback")}</dt>
          <dd className="text-right tabular text-cyan">
            {r.paybackMonths === null ? "—" : t("months", { n: r.paybackMonths.toFixed(1) })}
          </dd>
        </dl>
        {r.paybackMonths === null && <p className="mt-3 text-sm text-danger">{t("never")}</p>}
        <p className="mt-5 flex-1 text-xs text-dim">{t("note")}</p>
        <ButtonLink href="/contact" className="mt-5">
          {t("cta")}
        </ButtonLink>
      </div>
    </div>
  );
}
