"use client";

import { useCallback, useRef, useState } from "react";

export type ModelState = "idle" | "loading" | "ready" | "error";
export type Progress = (fraction: number | null) => void;

/**
 * Lazily loads a model once, on first use, and exposes its loading state.
 * `factory` must be stable (define it at module scope or memoise it).
 */
export function useModel<T>(factory: (onProgress: Progress) => Promise<T>) {
  const [state, setState] = useState<ModelState>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const promise = useRef<Promise<T> | null>(null);
  const model = useRef<T | null>(null);
  const loadedWith = useRef(factory);

  const load = useCallback(async (): Promise<T> => {
    // A different factory (e.g. another OCR language) means a different model.
    if (loadedWith.current !== factory) {
      loadedWith.current = factory;
      model.current = null;
      promise.current = null;
    }
    if (model.current) return model.current;
    if (!promise.current) {
      setState("loading");
      setProgress(null);
      promise.current = factory(setProgress)
        .then((m) => {
          model.current = m;
          setState("ready");
          return m;
        })
        .catch((e) => {
          promise.current = null;
          setState("error");
          console.error("[demo] model failed to load", e);
          throw e;
        });
    }
    return promise.current;
  }, [factory]);

  const get = useCallback(() => model.current, []);

  return { state, progress, load, get };
}

/** Aggregate Transformers.js per-file progress events into one 0..1 fraction. */
export function hfProgress(onProgress: Progress) {
  const files = new Map<string, { loaded: number; total: number }>();
  return (e: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (e.status !== "progress" || !e.file || !e.total) return;
    files.set(e.file, { loaded: e.loaded ?? 0, total: e.total });
    let loaded = 0;
    let total = 0;
    files.forEach((f) => {
      loaded += f.loaded;
      total += f.total;
    });
    onProgress(total ? loaded / total : null);
  };
}
