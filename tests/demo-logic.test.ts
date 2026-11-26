import { describe, expect, it } from "vitest";
import { fitWithin } from "@/lib/demo/image";
import { LineCounter, sideOfLine } from "@/lib/demo/linecross";

describe("fitWithin", () => {
  it("downscales a very large photo to the max side, keeping aspect ratio", () => {
    expect(fitWithin(6000, 4000, 1280)).toEqual({ w: 1280, h: 853 });
    expect(fitWithin(3000, 6000, 1280)).toEqual({ w: 640, h: 1280 });
  });
  it("never upscales small images", () => {
    expect(fitWithin(640, 480, 1280)).toEqual({ w: 640, h: 480 });
  });
  it("handles zero sizes without NaN", () => {
    expect(fitWithin(0, 0, 1280)).toEqual({ w: 0, h: 0 });
  });
});

// Vertical line through x = 0.5, drawn bottom → top so that "right" is the positive side.
const A = { x: 0.5, y: 1 };
const B = { x: 0.5, y: 0 };

describe("sideOfLine", () => {
  it("returns opposite signs on each side and 0 inside the dead zone", () => {
    expect(sideOfLine({ x: 0.2, y: 0.5 }, A, B)).toBe(-1);
    expect(sideOfLine({ x: 0.8, y: 0.5 }, A, B)).toBe(1);
    expect(sideOfLine({ x: 0.505, y: 0.5 }, A, B, 0.02)).toBe(0);
  });
});

describe("LineCounter", () => {
  it("counts one 'in' when a person walks from left to right", () => {
    const c = new LineCounter(A, B);
    for (let x = 0.2; x <= 0.8; x += 0.05) c.update([{ x, y: 0.5 }]);
    expect(c.counts).toEqual({ in: 1, out: 0 });
  });

  it("counts one 'out' when walking right to left", () => {
    const c = new LineCounter(A, B);
    for (let x = 0.8; x >= 0.2; x -= 0.05) c.update([{ x, y: 0.5 }]);
    expect(c.counts).toEqual({ in: 0, out: 1 });
  });

  it("does not double count jitter around the line", () => {
    const c = new LineCounter(A, B);
    c.update([{ x: 0.3, y: 0.5 }]);
    c.update([{ x: 0.42, y: 0.5 }]);
    for (const x of [0.49, 0.51, 0.495, 0.505, 0.49, 0.51]) c.update([{ x, y: 0.5 }]);
    for (const x of [0.58, 0.66, 0.74]) c.update([{ x, y: 0.5 }]);
    expect(c.counts).toEqual({ in: 1, out: 0 });
  });

  it("tracks two people independently", () => {
    const c = new LineCounter(A, B);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      c.update([
        { x: 0.2 + 0.6 * t, y: 0.2 }, // left → right
        { x: 0.8 - 0.6 * t, y: 0.8 }, // right → left
      ]);
    }
    expect(c.counts).toEqual({ in: 1, out: 1 });
  });

  it("forgets tracks that disappear, so a new person isn't matched to a ghost", () => {
    const c = new LineCounter(A, B, { maxAge: 3 });
    c.update([{ x: 0.3, y: 0.5 }]);
    for (let i = 0; i < 5; i++) c.update([]);
    expect(c.tracks).toHaveLength(0);
  });

  it("reset() clears counts and tracks", () => {
    const c = new LineCounter(A, B);
    for (let x = 0.2; x <= 0.8; x += 0.1) c.update([{ x, y: 0.5 }]);
    c.reset();
    expect(c.counts).toEqual({ in: 0, out: 0 });
    expect(c.tracks).toHaveLength(0);
  });
});
