"use client";

import { hasWebGPU, transformers } from "@/lib/demo/hf";
import { hfProgress, type Progress } from "@/lib/demo/useModel";

const MODEL = "onnx-community/Florence-2-base-ft";

export const FLORENCE_TASKS = {
  describe: "<MORE_DETAILED_CAPTION>",
  objects: "<OD>",
  find: "<CAPTION_TO_PHRASE_GROUNDING>",
  text: "<OCR>",
} as const;
export type FlorenceTask = keyof typeof FLORENCE_TASKS;

export type FlorenceAnswer = { text?: string; boxes?: { label: string; box: number[] }[] };
/** Ask Florence-2 one question about a picture. `query` is the phrase to find for the "find" task. */
export type Florence = (input: HTMLCanvasElement, task: FlorenceTask, query?: string) => Promise<FlorenceAnswer>;

/** Florence-2 (MIT licence): one small model that captions, finds objects, grounds phrases and reads text. */
export async function loadFlorence(onProgress: Progress): Promise<Florence> {
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

  return async (input, task, query = "") => {
    const image = t.RawImage.fromCanvas(input);
    const vision = await processor(image);
    const token = FLORENCE_TASKS[task];
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
