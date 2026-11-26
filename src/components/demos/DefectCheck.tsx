"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel } from "@/lib/demo/useModel";
import { loadClip, zeroShot, type Clip } from "@/lib/demo/clip";
import { samples } from "@/lib/content";

/** Zero-shot classification with CLIP: compare the image embedding to each label's text embedding. */
async function score(clip: Clip, input: HTMLCanvasElement, labels: string[]) {
  const [img, txt] = await Promise.all([clip.embedImage(input), clip.embedTexts(labels.map((l) => `a photo of ${l}`))]);
  const probs = zeroShot(img, txt);
  return labels.map((label, i) => ({ label, score: probs[i] })).sort((a, b) => b.score - a.score);
}

const parse = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);

export default function DefectCheckDemo() {
  const t = useTranslations("demos.ui");
  const model = useModel(loadClip);
  const [draft, setDraft] = useState("fresh bread, burnt bread, moldy bread");
  const [labels, setLabels] = useState(parse(draft));
  const [scores, setScores] = useState<{ label: string; score: number }[]>([]);

  const applyLabels = (s: string) => {
    setDraft(s);
    setLabels(parse(s));
  };

  return (
    <DemoStage
      webcam={false}
      size="153 MB"
      model={model}
      maxSide={768}
      samples={[
        { key: "bread", url: samples.bread, onSelect: () => applyLabels("fresh bread, burnt bread, moldy bread") },
        { key: "manCar", url: samples.manCar, onSelect: () => applyLabels("clean car, damaged car, dirty car") },
        { key: "house", url: samples.house, onSelect: () => applyLabels("well-kept house, damaged house, house under construction") },
      ]}
      onImage={async (input) => {
        if (labels.length < 2) return;
        setScores(await score(model.get()!, input, labels));
      }}
      rerunKey={labels.join("|")}
      onSourceChange={() => setScores([])}
    >
      <Panel title={t("labels")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLabels(parse(draft));
          }}
        >
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="field resize-none tabular text-sm" aria-label={t("labels")} />
          <button type="submit" className="mt-3 w-full rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-bg hover:bg-cyan-hi">
            {t("classify")}
          </button>
        </form>
        <p className="mt-3 text-xs text-dim">{t("labelsHint")}</p>
      </Panel>
      <Panel title={t("results")}>
        {scores.length === 0 ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : (
          <ul className="space-y-3">
            {scores.map((s, i) => (
              <li key={s.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={i === 0 ? "font-semibold text-text" : "text-muted"}>
                    {i === 0 && <span className="mr-1.5 text-lime">★</span>}
                    {s.label}
                  </span>
                  <span className="tabular">{(s.score * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-lime" : "bg-cyan/60"}`} style={{ width: `${Math.max(1, s.score * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DemoStage>
  );
}
