import { describe, expect, it } from "vitest";
import { CentroidTracker, DwellMonitor, Heatmap, SpeedTrap } from "@/lib/demo/tracker";

describe("CentroidTracker", () => {
  it("keeps the same id for an object that moves a little", () => {
    const tr = new CentroidTracker(0.1, 3);
    const [a] = tr.update([{ x: 0.5, y: 0.5 }], 0);
    const [b] = tr.update([{ x: 0.53, y: 0.52 }], 100);
    expect(b.id).toBe(a.id);
    expect(b.det).toBe(0);
  });

  it("starts a new track for a far-away point and drops lost tracks", () => {
    const tr = new CentroidTracker(0.1, 1);
    tr.update([{ x: 0.1, y: 0.1 }], 0);
    tr.update([{ x: 0.9, y: 0.9 }], 100);
    expect(tr.tracks.map((t) => t.id)).toEqual([1, 2]);
    tr.update([{ x: 0.9, y: 0.9 }], 200);
    expect(tr.tracks.map((t) => t.id)).toEqual([2]);
  });
});

describe("DwellMonitor", () => {
  const zone = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 1 },
  ];

  it("counts time inside the zone and records a finished visit when the person leaves", () => {
    const tr = new CentroidTracker(0.2, 5);
    const dm = new DwellMonitor(zone);
    for (let t = 0; t <= 3000; t += 100) dm.update(tr.update([{ x: 0.25, y: 0.5 }], t), t);
    expect(dm.stats.inZone).toBe(1);
    expect(dm.stats.longest).toBeGreaterThanOrEqual(2900);
    // Walk out of the zone a step at a time, as in real video.
    for (let i = 1; i <= 8; i++) dm.update(tr.update([{ x: 0.25 + i * 0.05, y: 0.5 }], 3000 + i * 100), 3000 + i * 100);
    expect(dm.stats.inZone).toBe(0);
    expect(dm.stats.visits).toBe(1);
    expect(dm.stats.average).toBeGreaterThanOrEqual(2900);
  });

  it("ignores visits shorter than a second", () => {
    const tr = new CentroidTracker(0.2, 5);
    const dm = new DwellMonitor(zone);
    dm.update(tr.update([{ x: 0.25, y: 0.5 }], 0), 0);
    dm.update(tr.update([{ x: 0.3, y: 0.5 }], 300), 300);
    dm.update(tr.update([{ x: 0.6, y: 0.5 }], 400), 400);
    expect(dm.stats.visits).toBe(0);
  });
});

describe("SpeedTrap", () => {
  it("turns the time between two lines into km/h", () => {
    // Lines across the road at y = 0.8 (A) and y = 0.6 (B), 10 m apart.
    const trap = new SpeedTrap(
      [{ x: 0, y: 0.8 }, { x: 1, y: 0.8 }],
      [{ x: 0, y: 0.6 }, { x: 1, y: 0.6 }],
      10,
    );
    const tr = new CentroidTracker(0.2, 5);
    // A car moving up the frame: crosses A at ~200 ms and B at ~1200 ms → 10 m / 1 s = 36 km/h.
    for (let t = 0; t <= 1600; t += 100) {
      const y = 0.82 - (t / 1000) * 0.2;
      trap.update(tr.update([{ x: 0.5, y }], t), t);
    }
    expect(trap.log).toHaveLength(1);
    expect(trap.log[0]).toBeGreaterThan(30);
    expect(trap.log[0]).toBeLessThan(42);
  });

  it("forgetTracks keeps the measurements", () => {
    const trap = new SpeedTrap([{ x: 0, y: 0.8 }, { x: 1, y: 0.8 }], [{ x: 0, y: 0.6 }, { x: 1, y: 0.6 }], 10);
    trap.log.push(50);
    trap.forgetTracks();
    expect(trap.log).toEqual([50]);
  });
});

describe("Heatmap", () => {
  it("builds heat where points land and reports how concentrated it is", () => {
    const h = new Heatmap(10, 10);
    for (let i = 0; i < 50; i++) h.add([{ x: 0.55, y: 0.55 }]);
    h.add([{ x: 0.05, y: 0.05 }]);
    expect(h.grid[5 * 10 + 5]).toBe(h.max);
    expect(h.total).toBe(51);
    expect(h.hotspotShare()).toBeGreaterThan(0.9);
  });
});
