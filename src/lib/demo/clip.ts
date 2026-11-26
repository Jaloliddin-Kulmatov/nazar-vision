"use client";

import { transformers } from "@/lib/demo/hf";
import { hfProgress, type Progress } from "@/lib/demo/useModel";

/**
 * OpenAI CLIP ViT-B/32, MIT licence (code and weights). Apple's smaller MobileCLIP was used before,
 * but its weights are licensed for non-commercial research only.
 */
const MODEL = "Xenova/clip-vit-base-patch32";

/** CLIP (about 150 MB): puts pictures and short texts in the same space, so they can be compared. */
export type Clip = {
  /** Unit-length embedding of a picture. */
  embedImage(input: HTMLCanvasElement): Promise<number[]>;
  /** Several pictures in one batch (faster than one by one). */
  embedImages(inputs: HTMLCanvasElement[]): Promise<number[][]>;
  /** Unit-length embeddings of texts; repeated texts come from a cache. */
  embedTexts(texts: string[]): Promise<number[][]>;
};

export async function loadClip(onProgress: Progress): Promise<Clip> {
  const t = await transformers();
  const progress_callback = hfProgress(onProgress);
  const [tokenizer, textModel, processor, visionModel] = await Promise.all([
    t.AutoTokenizer.from_pretrained(MODEL),
    t.CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: "q8", progress_callback }),
    t.AutoProcessor.from_pretrained(MODEL),
    t.CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: "q8", progress_callback }),
  ]);
  const textCache = new Map<string, number[]>();

  const embedImages = async (canvases: HTMLCanvasElement[]) => {
    const inputs = await processor(canvases.map((c) => t.RawImage.fromCanvas(c)));
    const { image_embeds } = await visionModel(inputs);
    return image_embeds.normalize(2, -1).tolist() as number[][];
  };

  return {
    embedImages,
    async embedImage(input) {
      return (await embedImages([input]))[0];
    },
    async embedTexts(texts) {
      const missing = texts.filter((x) => !textCache.has(x));
      if (missing.length) {
        const inputs = tokenizer(missing, { padding: "max_length", truncation: true });
        const { text_embeds } = await textModel(inputs);
        (text_embeds.normalize(2, -1).tolist() as number[][]).forEach((v, i) => textCache.set(missing[i], v));
      }
      return texts.map((x) => textCache.get(x)!);
    },
  };
}

export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/** CLIP-style zero-shot probabilities: softmax of 100 × cosine similarity. */
export function zeroShot(image: number[], texts: number[][]): number[] {
  const logits = texts.map((v) => 100 * dot(v, image));
  const max = Math.max(...logits);
  const exp = logits.map((l) => Math.exp(l - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => e / sum);
}
