import { describe, expect, it } from "vitest";
import { parseUzPlate } from "@/lib/demo/plates";
import { FallMonitor, type PoseSample } from "@/lib/demo/fall";
import { ConfirmGate, LeftBehindMonitor } from "@/lib/demo/leftBehind";
import { csvCell, toCsvText } from "@/lib/csv";

describe("Uzbek plate parser", () => {
  it("reads clean private and company plates", () => {
    expect(parseUzPlate("01 Q 184 OA")).toMatchObject({ text: "01 Q 184 OA", kind: "private", region: "tashkentCity", fixes: 0 });
    expect(parseUzPlate("30 123 ABC")).toMatchObject({ text: "30 123 ABC", kind: "company", region: "samarkand" });
  });

  it("ignores the UZ mark, flag noise and punctuation", () => {
    expect(parseUzPlate("01|H 728 VB UZ")?.text).toBe("01 H 728 VB");
    expect(parseUzPlate("~ 01H728VB  =UZ")?.text).toBe("01 H 728 VB");
  });

  it("fixes look-alike characters by position", () => {
    const p = parseUzPlate("O1 H 72B VB");
    expect(p?.text).toBe("01 H 728 VB");
    expect(p?.fixes).toBe(2);
  });

  it("drops one doubled or stray character", () => {
    expect(parseUzPlate("D1Q1884OA")?.text).toBe("01 Q 184 OA");
    expect(parseUzPlate("01|1Q 184 OA")?.text).toBe("01 Q 184 OA");
  });

  it("tries every digit a look-alike letter could be, so the region decides", () => {
    expect(parseUzPlate("G1H728 VB")?.text).toBe("01 H 728 VB");
  });

  it("rejects unknown regions, wrong shapes and too many fixes", () => {
    expect(parseUzPlate("02 A 123 BC")).toBeNull();
    expect(parseUzPlate("HELLO WORLD")).toBeNull();
    expect(parseUzPlate("OI H ZZB VB")).toBeNull();
  });
});

const run = (m: FallMonitor, samples: PoseSample[]) => samples.map((s) => m.update(s)).filter(Boolean);
const span = (from: number, to: number, step: number, f: (t: number) => Omit<PoseSample, "t">) => {
  const out: PoseSample[] = [];
  for (let t = from; t <= to; t += step) out.push({ t, ...f(t) });
  return out;
};
const standing = { tilt: 5, hipY: 0.5, aspect: 0.4 };
const lying = { tilt: 85, hipY: 0.75, aspect: 2.2 };

describe("fall monitor", () => {
  it("raises one fall alert when someone drops and stays down", () => {
    const m = new FallMonitor();
    const events = run(m, [...span(0, 1000, 100, () => standing), ...span(1200, 4000, 100, () => lying)]);
    expect(events).toEqual(["fall"]);
    expect(m.state).toBe("fallen");
  });

  it("calls a person found lying 'down', not a fall", () => {
    const m = new FallMonitor();
    expect(run(m, span(0, 5000, 100, () => lying))).toEqual(["lying"]);
  });

  it("ignores squats and quick bends", () => {
    const m = new FallMonitor();
    const squat = span(0, 3000, 100, (t) => ({ tilt: 25, hipY: 0.5 + 0.15 * Math.sin(t / 500), aspect: 0.6 }));
    const bend = [...span(3100, 3500, 100, () => ({ tilt: 75, hipY: 0.55, aspect: 0.9 })), ...span(3600, 5000, 100, () => standing)];
    expect(run(m, [...squat, ...bend])).toEqual([]);
  });

  it("ignores someone bent over for a long time (tipped torso, standing legs)", () => {
    const m = new FallMonitor();
    const bent = span(0, 8000, 100, () => ({ tilt: 85, hipY: 0.55, aspect: 0.7 }));
    expect(run(m, [...span(0, 900, 100, () => standing), ...bent.map((s) => ({ ...s, t: s.t + 1000 }))])).toEqual([]);
  });

  it("can alert again after the person gets up", () => {
    const m = new FallMonitor();
    const seq = [
      ...span(0, 1000, 100, () => standing),
      ...span(1100, 2500, 100, () => lying),
      ...span(2600, 4000, 100, () => standing),
      ...span(4100, 5500, 100, () => lying),
    ];
    expect(run(m, seq)).toEqual(["fall", "fall"]);
  });
});

describe("left-behind monitor", () => {
  const bag = { x: 0.5, y: 0.7, w: 0.08, h: 0.12 };
  const owner = { x: 0.45, y: 0.3, w: 0.1, h: 0.5 };
  const farAway = { x: 0.05, y: 0.3, w: 0.1, h: 0.5 };

  it("alerts once when a still bag is left alone past the limit", () => {
    const m = new LeftBehindMonitor({ stillMs: 1000, moveTol: 0.03, reach: 0.6, alertMs: 3000 });
    const fired: number[] = [];
    for (let t = 0; t <= 8000; t += 200) {
      const people = t < 2000 ? [owner] : [farAway];
      fired.push(...m.update([{ id: 7, box: bag }], people, t).fired);
    }
    expect(fired).toEqual([7]);
    expect(m.alerts).toBe(1);
  });

  it("stays quiet while the owner is next to it, and while the bag is carried", () => {
    const m = new LeftBehindMonitor({ stillMs: 1000, moveTol: 0.03, reach: 0.6, alertMs: 2000 });
    let fired = 0;
    for (let t = 0; t <= 6000; t += 200) fired += m.update([{ id: 1, box: bag }], [owner], t).fired.length;
    for (let t = 6200; t <= 12000; t += 200) {
      const moving = { ...bag, x: 0.1 + (t - 6200) / 20000 };
      fired += m.update([{ id: 1, box: moving }], [], t).fired.length;
    }
    expect(fired).toBe(0);
  });
});

describe("confirm gate", () => {
  it("needs several agreeing checks, and counts what a single-frame alarm would have raised", () => {
    const g = new ConfirmGate(3, 5);
    const flicker = [true, false, false, true, false, false, true, false];
    flicker.forEach((h) => g.push(h));
    expect(g.alarms).toBe(0);
    expect(g.rawHits).toBe(3);
    const fired = [true, true, true, true].map((h) => g.push(h));
    expect(fired.filter(Boolean)).toHaveLength(1);
    expect(g.on).toBe(true);
  });
});

describe("csv", () => {
  it("quotes cells and defuses formulas", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(toCsvText(["a", "b"], [[1, null]])).toBe('a,b\n"1",""\n');
  });
});

describe("rate limit (memory fallback)", () => {
  it("counts hits per key within a window and resets after it", async () => {
    const { memoryHit, visitorKey, LIMITS } = await import("@/lib/rateLimit");
    const key = visitorKey(LIMITS.contact, "203.0.113.9");
    expect(key).not.toContain("203.0.113.9");
    const hits = [0, 1000, 2000].map((t) => memoryHit(key, 60, 1_000_000 + t));
    expect(hits).toEqual([1, 2, 3]);
    expect(memoryHit(key, 60, 1_000_000 + 61_000)).toBe(1);
    expect(memoryHit(visitorKey(LIMITS.contact, "198.51.100.1"), 60, 1_000_000)).toBe(1);
  });
});
