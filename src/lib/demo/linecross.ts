export type Pt = { x: number; y: number };

/**
 * Which side of the directed line a→b the point is on: -1, 1, or 0 when it's
 * within `deadZone` (normalised distance) of the line.
 */
export function sideOfLine(p: Pt, a: Pt, b: Pt, deadZone = 0.02): -1 | 0 | 1 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const dist = (dx * (p.y - a.y) - dy * (p.x - a.x)) / len;
  if (Math.abs(dist) < deadZone) return 0;
  // For a line drawn bottom→top (in screen coordinates), the right-hand side is positive.
  return dist < 0 ? -1 : 1;
}

type Track = { id: number; x: number; y: number; side: -1 | 0 | 1; age: number };

/**
 * Counts objects crossing a line with a tiny nearest-centroid tracker.
 * Coordinates are normalised to 0..1. Moving from side -1 to +1 counts as "in".
 */
export class LineCounter {
  counts = { in: 0, out: 0 };
  tracks: Track[] = [];
  private nextId = 1;
  private maxDist: number;
  private maxAge: number;
  private deadZone: number;

  constructor(
    public a: Pt,
    public b: Pt,
    opts: { maxDist?: number; maxAge?: number; deadZone?: number } = {},
  ) {
    this.maxDist = opts.maxDist ?? 0.15;
    this.maxAge = opts.maxAge ?? 15;
    this.deadZone = opts.deadZone ?? 0.02;
  }

  setLine(a: Pt, b: Pt) {
    this.a = a;
    this.b = b;
    this.tracks = [];
  }

  reset() {
    this.counts = { in: 0, out: 0 };
    this.tracks = [];
  }

  update(points: Pt[]): { in: number; out: number } {
    // Greedy matching on all (track, point) pairs, closest first.
    const pairs: [number, number, number][] = [];
    this.tracks.forEach((t, ti) =>
      points.forEach((p, pi) => {
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d <= this.maxDist) pairs.push([d, ti, pi]);
      }),
    );
    pairs.sort((p, q) => p[0] - q[0]);
    const usedT = new Set<number>();
    const usedP = new Set<number>();

    for (const [, ti, pi] of pairs) {
      if (usedT.has(ti) || usedP.has(pi)) continue;
      usedT.add(ti);
      usedP.add(pi);
      const t = this.tracks[ti];
      const p = points[pi];
      const side = sideOfLine(p, this.a, this.b, this.deadZone);
      if (side !== 0 && t.side !== 0 && side !== t.side) {
        if (side === 1) this.counts.in++;
        else this.counts.out++;
      }
      t.x = p.x;
      t.y = p.y;
      t.age = 0;
      if (side !== 0) t.side = side;
    }

    this.tracks.forEach((t, ti) => {
      if (!usedT.has(ti)) t.age++;
    });
    this.tracks = this.tracks.filter((t) => t.age <= this.maxAge);

    points.forEach((p, pi) => {
      if (usedP.has(pi)) return;
      this.tracks.push({ id: this.nextId++, x: p.x, y: p.y, side: sideOfLine(p, this.a, this.b, this.deadZone), age: 0 });
    });

    return this.counts;
  }
}
