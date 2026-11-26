import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import uz from "../messages/uz.json";
import ru from "../messages/ru.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => keys(v, `${prefix}[${i}]`));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      keys(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

function placeholders(obj: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const walk = (v: unknown, p: string) => {
    if (typeof v === "string") out[p] = (v.match(/\{\w+\}/g) ?? []).sort();
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => walk(x, p ? `${p}.${k}` : k));
  };
  walk(obj, "");
  return out;
}

describe("translations", () => {
  const enKeys = keys(en).sort();

  it.each([
    ["uz", uz],
    ["ru", ru],
  ])("%s has exactly the same keys as en", (_name, messages) => {
    expect(keys(messages).sort()).toEqual(enKeys);
  });

  it.each([
    ["uz", uz],
    ["ru", ru],
  ])("%s keeps the same {placeholders} as en", (_name, messages) => {
    expect(placeholders(messages)).toEqual(placeholders(en));
  });

  it("has no empty strings", () => {
    for (const m of [en, uz, ru]) {
      const empty = Object.entries(placeholders(m)).filter(([k]) => {
        const v = k.split(/\.|\[|\]/).filter(Boolean).reduce<unknown>(
          (acc, part) => (acc as Record<string, unknown>)?.[part],
          m,
        );
        return typeof v === "string" && v.trim() === "";
      });
      expect(empty).toEqual([]);
    }
  });
});
