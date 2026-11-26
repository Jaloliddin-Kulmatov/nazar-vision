import { describe, expect, it } from "vitest";
import { pointInPolygon, ZoneMonitor } from "@/lib/demo/zone";
import { FatigueTracker } from "@/lib/demo/fatigue";
import { matchPpe } from "@/lib/demo/ppe";

const square = [
  { x: 0.2, y: 0.2 },
  { x: 0.6, y: 0.2 },
  { x: 0.6, y: 0.6 },
  { x: 0.2, y: 0.6 },
];

describe("pointInPolygon", () => {
  it("detects inside and outside points", () => {
    expect(pointInPolygon({ x: 0.4, y: 0.4 }, square)).toBe(true);
    expect(pointInPolygon({ x: 0.7, y: 0.4 }, square)).toBe(false);
    expect(pointInPolygon({ x: 0.1, y: 0.1 }, square)).toBe(false);
  });
  it("handles concave polygons", () => {
    const l = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.3 }, { x: 0.3, y: 0.3 }, { x: 0.3, y: 1 }, { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.1, y: 0.8 }, l)).toBe(true);
    expect(pointInPolygon({ x: 0.8, y: 0.8 }, l)).toBe(false);
  });
  it("is false for fewer than 3 points", () => {
    expect(pointInPolygon({ x: 0, y: 0 }, square.slice(0, 2))).toBe(false);
  });
});

describe("ZoneMonitor", () => {
  it("counts one event per intrusion and ignores single dropped frames", () => {
    const z = new ZoneMonitor(500);
    const inside = [{ x: 0.4, y: 0.4 }];
    expect(z.update([], square, 0).events).toBe(0);
    let s = z.update(inside, square, 100);
    expect(s).toMatchObject({ inside: 1, alert: true, events: 1 });
    z.update([], square, 200); // one missed detection
    s = z.update(inside, square, 300);
    expect(s.events).toBe(1);
    expect(s.occupiedMs).toBe(200);
    z.update([], square, 1000); // gone for longer than the grace period
    expect(z.update(inside, square, 1100).events).toBe(2);
    z.reset();
    expect(z.update([], square, 1200).events).toBe(0);
  });
});

describe("FatigueTracker", () => {
  it("counts short closures as blinks and long ones as microsleep", () => {
    const f = new FatigueTracker();
    f.update(0, 0.1, 0);
    f.update(100, 0.8, 0);
    expect(f.update(250, 0.1, 0).blinks).toBe(1);
    f.update(1000, 0.9, 0);
    const s = f.update(2600, 0.9, 0);
    expect(s.alert).toBe("microsleep");
    expect(s.closedMs).toBe(1600);
    expect(f.update(2700, 0.1, 0).blinks).toBe(1); // a microsleep is not a blink
  });
  it("counts a yawn once, only after the minimum duration", () => {
    const f = new FatigueTracker();
    f.update(0, 0, 0.7);
    expect(f.update(500, 0, 0.7).yawns).toBe(0);
    expect(f.update(900, 0, 0.7).yawns).toBe(1);
    expect(f.update(1500, 0, 0.7).yawns).toBe(1);
    f.update(1600, 0, 0.1);
    f.update(1700, 0, 0.8);
    expect(f.update(2600, 0, 0.8).yawns).toBe(2);
  });
  it("raises a drowsy alert when PERCLOS stays high", () => {
    const f = new FatigueTracker({ microsleepMs: 10_000 });
    let s = f.update(0, 0, 0);
    // eyes closed 30% of the time, in 300 ms chunks every second
    for (let t = 100; t <= 8000; t += 100) s = f.update(t, t % 1000 < 300 ? 0.9 : 0.1, 0);
    expect(s.perclos).toBeGreaterThan(0.25);
    expect(s.alert).toBe("drowsy");
  });
});

describe("matchPpe", () => {
  const person = { x: 100, y: 100, w: 100, h: 300 };
  it("matches a helmet on the head, not one at the feet", () => {
    expect(matchPpe([person], [{ x: 120, y: 90, w: 60, h: 40 }], "head")).toEqual([true]);
    expect(matchPpe([person], [{ x: 120, y: 360, w: 60, h: 40 }], "head")).toEqual([false]);
  });
  it("matches a vest on the torso", () => {
    expect(matchPpe([person], [{ x: 110, y: 160, w: 80, h: 100 }], "torso")).toEqual([true]);
  });
  it("uses each item for one person only", () => {
    const p2 = { x: 120, y: 100, w: 100, h: 300 };
    expect(matchPpe([person, p2], [{ x: 130, y: 90, w: 60, h: 40 }], "head")).toEqual([true, false]);
  });
});
