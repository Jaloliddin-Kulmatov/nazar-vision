/**
 * Left-behind object detection: a bag that stops moving and has no person near it
 * for longer than the limit raises one alert. Coordinates are normalised to 0..1.
 */

export type Box = { x: number; y: number; w: number; h: number };
export type BagStatus = "moving" | "attended" | "unattended" | "alert";
export type BagState = { id: number; status: BagStatus; aloneMs: number };

export type LeftBehindOptions = {
  /** How long a bag must stay put before it counts as set down. */
  stillMs: number;
  /** How far the centre may wander and still count as not moving. */
  moveTol: number;
  /** A person whose box, grown by this factor, touches the bag is with it. */
  reach: number;
  /** How long a still bag may be alone before the alert. */
  alertMs: number;
};

export const LEFT_DEFAULTS: LeftBehindOptions = { stillMs: 1500, moveTol: 0.03, reach: 0.6, alertMs: 5000 };

type Item = { ax: number; ay: number; anchoredAt: number; aloneSince: number | null; alerted: boolean; seen: number };

const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Does person box p, grown on each side by `reach` of its size, overlap box b? */
export function near(p: Box, b: Box, reach: number): boolean {
  const gx = p.w * reach;
  const gy = p.h * reach * 0.5;
  return p.x - gx < b.x + b.w && p.x + p.w + gx > b.x && p.y - gy < b.y + b.h && p.y + p.h + gy > b.y;
}

export class LeftBehindMonitor {
  private items = new Map<number, Item>();
  alerts = 0;

  constructor(public o: LeftBehindOptions = LEFT_DEFAULTS) {}

  reset() {
    this.items.clear();
    this.alerts = 0;
  }

  /** `bags` carry tracker ids; returns each bag's status and the ids that just raised an alert. */
  update(bags: { id: number; box: Box }[], people: Box[], now: number): { states: BagState[]; fired: number[] } {
    const fired: number[] = [];
    const states: BagState[] = [];
    for (const { id, box } of bags) {
      const c = centre(box);
      let it = this.items.get(id);
      if (!it) {
        it = { ax: c.x, ay: c.y, anchoredAt: now, aloneSince: null, alerted: false, seen: now };
        this.items.set(id, it);
      }
      it.seen = now;
      if (Math.hypot(c.x - it.ax, c.y - it.ay) > this.o.moveTol) {
        it.ax = c.x;
        it.ay = c.y;
        it.anchoredAt = now;
        it.aloneSince = null;
        it.alerted = false;
      }
      const still = now - it.anchoredAt >= this.o.stillMs;
      const attended = people.some((p) => near(p, box, this.o.reach));
      if (!still) {
        states.push({ id, status: "moving", aloneMs: 0 });
        continue;
      }
      if (attended) {
        it.aloneSince = null;
        it.alerted = false;
        states.push({ id, status: "attended", aloneMs: 0 });
        continue;
      }
      it.aloneSince ??= now;
      const aloneMs = now - it.aloneSince;
      if (!it.alerted && aloneMs >= this.o.alertMs) {
        it.alerted = true;
        this.alerts++;
        fired.push(id);
      }
      states.push({ id, status: it.alerted ? "alert" : "unattended", aloneMs });
    }
    // Forget bags that have not been seen for a while.
    for (const [id, it] of this.items) if (now - it.seen > 3000) this.items.delete(id);
    return { states, fired };
  }
}

/**
 * Turns a noisy yes/no signal (one per check) into a steady alarm:
 * the alarm is on while at least `need` of the last `window` checks said yes.
 */
export class ConfirmGate {
  private recent: boolean[] = [];
  on = false;
  /** Checks that said yes on their own (what a single-frame system would alarm on). */
  rawHits = 0;
  /** Times the steady alarm switched on. */
  alarms = 0;

  constructor(
    public need = 4,
    public window = 6,
  ) {}

  reset() {
    this.recent = [];
    this.on = false;
    this.rawHits = 0;
    this.alarms = 0;
  }

  /** Returns true when the alarm has just switched on. */
  push(hit: boolean): boolean {
    if (hit) this.rawHits++;
    this.recent.push(hit);
    while (this.recent.length > this.window) this.recent.shift();
    const yes = this.recent.filter(Boolean).length;
    const was = this.on;
    this.on = yes >= this.need;
    if (this.on && !was) {
      this.alarms++;
      return true;
    }
    return false;
  }
}
