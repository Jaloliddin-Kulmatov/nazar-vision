export type Pt = { x: number; y: number };

/** Ray-casting point-in-polygon test. Works for any simple polygon (convex or not). */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export type ZoneState = { inside: number; alert: boolean; events: number; occupiedMs: number };

/**
 * Watches a restricted zone frame by frame. An "event" is the zone going from empty to occupied,
 * which needs no per-person tracking. `graceMs` stops one missed detection from ending an event.
 */
export class ZoneMonitor {
  events = 0;
  private since: number | null = null;
  private lastSeen = -Infinity;

  constructor(private graceMs = 500) {}

  update(points: Pt[], poly: Pt[], now: number): ZoneState {
    const inside = points.filter((p) => pointInPolygon(p, poly)).length;
    if (inside > 0) {
      if (this.since === null || now - this.lastSeen > this.graceMs) {
        this.events++;
        this.since = now;
      }
      this.lastSeen = now;
    } else if (this.since !== null && now - this.lastSeen > this.graceMs) {
      this.since = null;
    }
    const active = this.since !== null && now - this.lastSeen <= this.graceMs;
    return { inside, alert: inside > 0, events: this.events, occupiedMs: active ? now - this.since! : 0 };
  }

  reset() {
    this.events = 0;
    this.since = null;
    this.lastSeen = -Infinity;
  }
}
