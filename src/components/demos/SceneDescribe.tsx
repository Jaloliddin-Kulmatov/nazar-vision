"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import DemoStage, { Panel } from "@/components/demo/DemoStage";
import { hfProgress, useModel, type Progress } from "@/lib/demo/useModel";
import { hasWebGPU, transformers } from "@/lib/demo/hf";
import { drawBox } from "@/lib/demo/image";
import { samples, videos } from "@/lib/content";

const MODEL = "onnx-community/Florence-2-base-ft";

const TASKS = {
  describe: "<MORE_DETAILED_CAPTION>",
  objects: "<OD>",
  find: "<CAPTION_TO_PHRASE_GROUNDING>",
  text: "<OCR>",
} as const;
type Task = keyof typeof TASKS;

type Answer = { text?: string; boxes?: { label: string; box: number[] }[] };
type Asker = (input: HTMLCanvasElement, task: Task, query: string) => Promise<Answer>;

/** Florence-2 (MIT licence): one small model that captions, finds objects, grounds phrases and reads text. */
async function loadFlorence(onProgress: Progress): Promise<Asker> {
  const t = await transformers();
  const progress_callback = hfProgress(onProgress);
  const load = (gpu: boolean) =>
    t.Florence2ForConditionalGeneration.from_pretrained(MODEL, {
      device: gpu ? "webgpu" : "wasm",
      // On the GPU the vision encoder runs in half precision; on the CPU the 8-bit version is faster and smaller.
      dtype: { embed_tokens: "fp16", vision_encoder: gpu ? "fp16" : "q8", encoder_model: "q4", decoder_model_merged: "q4" },
      progress_callback,
    });
  let model;
  try {
    model = await load(hasWebGPU());
  } catch (e) {
    if (!hasWebGPU()) throw e;
    model = await load(false);
  }
  const [proc, tokenizer] = await Promise.all([t.AutoProcessor.from_pretrained(MODEL), t.AutoTokenizer.from_pretrained(MODEL)]);
  // Florence-2's processor adds task-prompt helpers that the generic Processor type doesn't declare.
  const processor = proc as typeof proc & {
    construct_prompts(text: string): string[];
    post_process_generation(text: string, task: string, size: [number, number]): Record<string, unknown>;
  };

  return async (input, task, query) => {
    const image = t.RawImage.fromCanvas(input);
    const vision = await processor(image);
    const token = TASKS[task];
    const prompt = processor.construct_prompts(task === "find" ? `${token}${query}` : token);
    const text = tokenizer(prompt);
    const ids = await model.generate({ ...text, ...vision, max_new_tokens: task === "describe" ? 120 : 256 });
    const raw = tokenizer.batch_decode(ids as never, { skip_special_tokens: false })[0];
    const parsed = processor.post_process_generation(raw, token, image.size);
    const out = parsed[token] as string | { labels: string[]; bboxes: number[][] };
    if (typeof out === "string") return { text: out.replace(/<\/?s>|<pad>/g, "").trim() };
    return { boxes: out.labels.map((label, i) => ({ label: label || query, box: out.bboxes[i] })) };
  };
}

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
