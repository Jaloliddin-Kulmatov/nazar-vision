"use client";

/** Lazily import Transformers.js and configure it for in-browser use. */
export async function transformers() {
  const t = await import("@huggingface/transformers");
  t.env.allowLocalModels = false;
  return t;
}

export function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
