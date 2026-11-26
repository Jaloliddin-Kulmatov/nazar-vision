"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Worker, Block } from "tesseract.js";
import { Copy, Check } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { useModel, type Progress } from "@/lib/demo/useModel";
import { samples } from "@/lib/content";

const LANGS = [
  { id: "eng+rus+uzb", label: "EN + RU + UZ" },
  { id: "eng", label: "English" },
  { id: "rus", label: "Русский" },
  { id: "uzb", label: "O‘zbek (lotin)" },
  { id: "uzb_cyrl", label: "Ўзбек (кирилл)" },
] as const;

/** Render a sample with Latin Uzbek, Cyrillic Russian and English, so all three scripts are shown. */
function trilingualSample(): string {
  const c = document.createElement("canvas");
  c.width = 1100;
  c.height = 560;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#111";
  const lines: [string, number][] = [
    ["INVOICE No. 2026-117", 44],
    ["Customer: Silk Road Textiles LLC", 30],
    ["Total amount: 12,450,000 UZS", 30],
    ["HISOB-FAKTURA: Toshkent shahri", 30],
    ["Mahsulot: paxta ipi, 120 kg", 30],
    ["СЧЁТ-ФАКТУРА: г. Ташкент", 30],
    ["Товар: хлопковая пряжа, 120 кг", 30],
  ];
  let y = 80;
  for (const [text, size] of lines) {
    ctx.font = `${size === 44 ? "700" : "400"} ${size}px Arial, Helvetica, sans-serif`;
    ctx.fillText(text, 60, y);
    y += size + 30;
  }
  return c.toDataURL("image/png");
}

export default function OcrDemo() {
  const t = useTranslations("demos.ui");
  const [lang, setLang] = useState<(typeof LANGS)[number]["id"]>("eng+rus+uzb");
  const [text, setText] = useState("");
  const [conf, setConf] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // One worker per language set; a new language set creates a new model loader.
  const factory = useMemo(
    () => async (onProgress: Progress): Promise<Worker> => {
      const { createWorker } = await import("tesseract.js");
      return createWorker(lang.split("+"), 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status.includes("loading") || m.status.includes("initializ")) onProgress(m.progress);
        },
      });
    },
    [lang],
  );
  const model = useModel(factory);

  const run = useCallback(
    async (input: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      const worker = model.get()!;
      const { data } = await worker.recognize(input, {}, { text: true, blocks: true });
      setText(data.text.trim());
      setConf(Math.round(data.confidence));
      const s = Math.max(1, ctx.canvas.width / 900);
      ctx.save();
      ctx.lineWidth = 2 * s;
      for (const block of (data.blocks ?? []) as Block[]) {
        for (const para of block.paragraphs)
          for (const line of para.lines)
            for (const w of line.words) {
              if (!w.text.trim()) continue;
              ctx.strokeStyle = w.confidence > 75 ? "#3ee0a0" : w.confidence > 50 ? "#ff9f43" : "#ff5d6c";
              ctx.fillStyle = w.confidence > 75 ? "rgba(62,224,160,.12)" : "rgba(255,181,71,.12)";
              const { x0, y0, x1, y1 } = w.bbox;
              ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
              ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
      }
      ctx.restore();
    },
    [model],
  );

  return (
    <DemoStage
      webcam={false}
      size="~10 MB"
      model={model}
      maxSide={2000}
      samples={[
        { key: "trilingual", url: trilingualSample },
        { key: "invoice", url: samples.invoice },
        { key: "receipt", url: samples.receipt },
      ]}
      onImage={run}
      rerunKey={lang}
    >
      <Panel title={t("language")}>
        <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="field" aria-label={t("language")}>
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </Panel>
      <Panel title={t("results")}>
        {text ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              {conf != null && (
                <span className="tabular text-xs text-muted">
                  {t("confidence")}: <span className="text-lime">{conf}%</span>
                </span>
              )}
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-xs hover:border-cyan hover:text-cyan"
              >
                {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg-2 p-3 tabular text-xs leading-relaxed">
              {text}
            </pre>
          </>
        ) : (
          <p className="text-sm text-muted">{t("noResults")}</p>
        )}
      </Panel>
    </DemoStage>
  );
}
