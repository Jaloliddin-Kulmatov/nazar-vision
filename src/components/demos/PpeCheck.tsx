"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { hfProgress, useModel, type Progress } from "@/lib/demo/useModel";
import { transformers } from "@/lib/demo/hf";
import { drawBox } from "@/lib/demo/image";
import { matchPpe, type BodyRegion, type Box } from "@/lib/demo/ppe";
import type { Det } from "@/lib/demo/detectors";
import { videos } from "@/lib/content";

type Finder = (input: HTMLCanvasElement, labels: string[]) => Promise<Det[]>;

/** OWLv2 finds objects described in plain words, with no training: the core of a fast PPE pilot. */
async function loadOwl(onProgress: Progress): Promise<Finder> {
  const t = await transformers();
  const pipe = await t.pipeline("zero-shot-object-detection", "onnx-community/owlv2-base-patch16-ensemble-ONNX", {
    dtype: "q8",
    progress_callback: hfProgress(onProgress),
  });
  type Out = { score: number; label: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } }[];
  return async (input, labels) => {
    const out = (await pipe(t.RawImage.fromCanvas(input), labels, { threshold: 0.05 })) as unknown as Out;
    return out.map((d) => ({
      name: d.label,
      score: d.score,
      x: d.box.xmin,
      y: d.box.ymin,
      w: d.box.xmax - d.box.xmin,
      h: d.box.ymax - d.box.ymin,
    }));
  };
}

const parse = (s: string) =>
  [...new Set(s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean))].slice(0, 8);

const isPerson = (l: string) => /person|worker|people|man|woman/.test(l);
const regionOf = (l: string): BodyRegion | null =>
  /hat|helmet|cap/.test(l) ? "head" : /vest|jacket|harness/.test(l) ? "torso" : null;

/** Drop overlapping duplicates of the same label (keep the higher score). */
function dedupe(dets: Det[]): Det[] {
  const iou = (a: Box, b: Box) => {
    const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const i = x * y;
    return i / (a.w * a.h + b.w * b.h - i || 1);
  };
  const kept: Det[] = [];
  for (const d of [...dets].sort((a, b) => b.score - a.score)) {
    if (!kept.some((k) => k.name === d.name && iou(k, d) > 0.5)) kept.push(d);
  }
  return kept;
}

type Report = { persons: number; checks: { item: string; ok: number }[]; counts: Record<string, number> };

export default function PpeCheckDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadOwl);
  const [draft, setDraft] = useState("person, helmet, high-visibility vest");
  const [labels, setLabels] = useState(parse(draft));
  const [threshold, setThreshold] = useState(0.25);
  const [report, setReport] = useState<Report | null>(null);
  const cache = useRef<{ key: string; dets: Det[] } | null>(null);

  const apply = (s: string) => {
    setDraft(s);
    setLabels(parse(s));
  };

  return (
    <DemoStage
      webcam={false}
      size="163 MB"
      model={model}
      maxSide={1024}
      samples={[
        { key: "hardhatFrame", url: videos.hardhat, kind: "frame", at: 4 },
        { key: "warehouseFrame", url: videos.warehouse, kind: "frame", at: 5 },
        { key: "workersFrame", url: videos.workers, kind: "frame", at: 6 },
      ]}
      onSourceChange={() => setReport(null)}
      onImage={async (input, ctx, imageId) => {
        const key = `${imageId}|${labels.join(",")}`;
        if (cache.current?.key !== key) cache.current = { key, dets: dedupe(await model.get()!(input, labels)) };
        const dets = cache.current.dets.filter((d) => d.score >= threshold);

        const persons = dets.filter((d) => isPerson(d.name));
        const items = labels.filter((l) => !isPerson(l) && regionOf(l));
        const worn = items.map((item) => ({
          item,
          ok: matchPpe(persons, dets.filter((d) => d.name === item), regionOf(item)!),
        }));
        const counts: Record<string, number> = {};
        for (const d of dets) {
          counts[d.name] = (counts[d.name] ?? 0) + 1;
          if (!isPerson(d.name)) drawBox(ctx, d.x, d.y, d.w, d.h, `${d.name} ${Math.round(d.score * 100)}%`, "#ffc629");
        }
        persons.forEach((p, i) => {
          const missing = worn.filter((w) => !w.ok[i]).map((w) => w.item);
          const label = missing.length ? `✗ ${missing.join(", ")}` : `✓ ${t("ppeOk")}`;
          drawBox(ctx, p.x, p.y, p.w, p.h, label, missing.length ? "#ff5d6c" : "#3ee0a0");
        });
        setReport({
          persons: persons.length,
          checks: worn.map((w) => ({ item: w.item, ok: w.ok.filter(Boolean).length })),
          counts,
        });
      }}
      rerunKey={`${threshold}|${labels.join(",")}`}
    >
      <Panel title={t("ppeItems")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLabels(parse(draft));
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setLabels(parse(draft))}
            rows={2}
            className="field resize-none tabular text-sm"
            aria-label={t("ppeItems")}
          />
          <button type="submit" className="mt-2 rounded-lg border border-line-strong px-3 py-1.5 text-sm hover:border-cyan hover:text-cyan">
            {t("apply")}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {["person, helmet, high-visibility vest", "person, helmet, gloves, safety glasses", "forklift, person, pallet, box"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => apply(p)}
              className="rounded-md border border-line px-2 py-1 tabular text-xs text-muted hover:border-cyan hover:text-cyan"
            >
              {p}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-dim">{t("ppeHint")}</p>
      </Panel>
      <Panel title={t("threshold")}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.05}
            max={0.5}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
            aria-label={t("threshold")}
          />
          <span className="w-12 text-right tabular text-sm text-cyan">{Math.round(threshold * 100)}%</span>
        </div>
      </Panel>
      <Panel title={t("results")}>
        {!report ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : (
          <div className="space-y-3 text-sm">
            {report.persons > 0 &&
              report.checks.map((c) => {
                const ok = c.ok === report.persons;
                return (
                  <p key={c.item} className={`flex items-center gap-2 ${ok ? "text-lime" : "text-danger"}`}>
                    {ok ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
                    {t("ppeWearing", { item: c.item, ok: c.ok, total: report.persons })}
                  </p>
                );
              })}
            <ul className="space-y-1.5 border-t border-line pt-3">
              {Object.entries(report.counts).map(([name, n]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="tabular text-lime">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </DemoStage>
  );
}
