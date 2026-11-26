import { pointInPolygon } from "./zone";
import { sideOfLine, type Pt } from "./linecross";

export type { Pt };

/** One followed object. Coordinates are normalised to 0..1; times are in ms. */
export type Track = {
  id: number;
  x: number;
  y: number;
  /** First and latest time the object was matched. */
  born: number;
  seen: number;
  /** Frames since the object was last matched. */
  missed: number;
  /** Index of the detection matched this frame, or -1. */
  det: number;
};

/**
 * Nearest-centroid tracker: matches each new point to the closest existing track
 * (closest pairs first), starts tracks for unmatched points and drops tracks
 * that go unmatched for `maxMissed` frames. Good enough for demos and slow scenes;
 * production systems use ByteTrack or similar.
 */
export class CentroidTracker {
  tracks: Track[] = [];
  private nextId = 1;

  constructor(
    private maxDist = 0.12,
    private maxMissed = 15,
  ) {}

  reset() {
    this.tracks = [];
    this.nextId = 1;
  }

  update(points: Pt[], now: number): Track[] {
    const pairs: [number, number, number][] = [];
    this.tracks.forEach((t, ti) =>
      points.forEach((p, pi) => {
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d <= this.maxDist) pairs.push([d, ti, pi]);
      }),
    );
    pairs.sort((a, b) => a[0] - b[0]);
    const usedT = new Set<number>();
    const usedP = new Set<number>();
    for (const t of this.tracks) t.det = -1;
    for (const [, ti, pi] of pairs) {
      if (usedT.has(ti) || usedP.has(pi)) continue;
      usedT.add(ti);
      usedP.add(pi);
      const t = this.tracks[ti];
      t.x = points[pi].x;
      t.y = points[pi].y;
      t.seen = now;
      t.missed = 0;
      t.det = pi;
    }
    this.tracks.forEach((t, ti) => {
      if (!usedT.has(ti)) t.missed++;
    });
    this.tracks = this.tracks.filter((t) => t.missed <= this.maxMissed);
    points.forEach((p, pi) => {
      if (!usedP.has(pi)) this.tracks.push({ id: this.nextId++, x: p.x, y: p.y, born: now, seen: now, missed: 0, det: pi });
    });
    return this.tracks;
  }
}

/** Time spent inside a zone, per track, plus finished visits for averages. */
export class DwellMonitor {
  /** Track id → ms spent in the zone during the current visit. */
  current = new Map<number, number>();
  /** Durations of finished visits, in ms. */
  finished: number[] = [];
  private lastNow = 0;
  private inside = new Set<number>();

  constructor(public zone: Pt[]) {}

  reset() {
    this.current.clear();
    this.finished = [];
    this.inside.clear();
    this.lastNow = 0;
  }

  /** Call once per frame with the live tracks. */
  update(tracks: Track[], now: number) {
    const dt = this.lastNow ? Math.min(now - this.lastNow, 500) : 0;
    this.lastNow = now;
    const alive = new Set(tracks.map((t) => t.id));
    const nowInside = new Set<number>();
    for (const t of tracks) {
      if (t.missed > 0) {
        // Briefly lost: keep the visit open but don't add time.
        if (this.inside.has(t.id)) nowInside.add(t.id);
        continue;
      }
      if (pointInPolygon(t, this.zone)) {
        nowInside.add(t.id);
        this.current.set(t.id, (this.current.get(t.id) ?? 0) + dt);
      }
    }
    // Visits end when a track leaves the zone or disappears.
    for (const id of this.inside) {
      if (!nowInside.has(id) || !alive.has(id)) {
        const ms = this.current.get(id) ?? 0;
        if (ms >= 1000) this.finished.push(ms);
        this.current.delete(id);
      }
    }
    this.inside = nowInside;
  }

  get stats() {
    const waits = [...this.inside].map((id) => this.current.get(id) ?? 0);
    const all = [...this.finished, ...waits];
    return {
      inZone: this.inside.size,
      longest: waits.length ? Math.max(...waits) : 0,
      average: all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0,
      visits: this.finished.length,
    };
  }
}

/**
 * Two-line speed trap: an object's speed is the real distance between the lines
 * divided by the time it takes to go from one line to the other.
 */
export class SpeedTrap {
  /** Track id → time it crossed line A / line B. */
  private crossed = new Map<number, { a?: number; b?: number; sideA: number; sideB: number }>();
  /** Track id → measured km/h. */
  speeds = new Map<number, number>();
  /** All measurements, newest last. */
  log: number[] = [];

  constructor(
    public lineA: [Pt, Pt],
    public lineB: [Pt, Pt],
    public meters: number,
  ) {}

  reset() {
    this.forgetTracks();
    this.log = [];
  }

  /** Drop per-vehicle state but keep the measurements (e.g. when a video loops). */
  forgetTracks() {
    this.crossed.clear();
    this.speeds.clear();
  }

  update(tracks: Track[], now: number) {
    for (const t of tracks) {
      if (t.missed > 0) continue;
      const sA = sideOfLine(t, this.lineA[0], this.lineA[1], 0.005);
      const sB = sideOfLine(t, this.lineB[0], this.lineB[1], 0.005);
      const c = this.crossed.get(t.id);
      if (!c) {
        this.crossed.set(t.id, { sideA: sA, sideB: sB });
        continue;
      }
      if (sA !== 0 && c.sideA !== 0 && sA !== c.sideA && c.a === undefined) c.a = now;
      if (sB !== 0 && c.sideB !== 0 && sB !== c.sideB && c.b === undefined) c.b = now;
      if (sA !== 0) c.sideA = sA;
      if (sB !== 0) c.sideB = sB;
      if (c.a !== undefined && c.b !== undefined && !this.speeds.has(t.id)) {
        const seconds = Math.abs(c.b - c.a) / 1000;
        if (seconds > 0.05) {
          const kmh = (this.meters / seconds) * 3.6;
          this.speeds.set(t.id, kmh);
          this.log.push(kmh);
        }
      }
    }
  }
}

/** Accumulates where things stand or walk, on a coarse grid. */
export class Heatmap {
  grid: Float32Array;
  max = 0;
  total = 0;

  constructor(
    public cols = 64,
    public rows = 36,
  ) {
    this.grid = new Float32Array(cols * rows);
  }

  reset() {
    this.grid.fill(0);
    this.max = 0;
    this.total = 0;
  }

  /** Adds a soft 3×3 splat at each point (normalised coordinates). */
  add(points: Pt[], weight = 1) {
    for (const p of points) {
      const cx = Math.floor(p.x * this.cols);
      const cy = Math.floor(p.y * this.rows);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
          const i = y * this.cols + x;
          this.grid[i] += weight * (dx === 0 && dy === 0 ? 1 : 0.35);
          if (this.grid[i] > this.max) this.max = this.grid[i];
        }
      }
      this.total += weight;
    }
  }

  /** Share of all activity that fell inside the busiest 10% of cells. */
  hotspotShare(): number {
    if (!this.total) return 0;
    const sorted = [...this.grid].sort((a, b) => b - a);
    const top = sorted.slice(0, Math.ceil(sorted.length / 10)).reduce((a, b) => a + b, 0);
    const all = sorted.reduce((a, b) => a + b, 0);
    return all ? top / all : 0;
  }
}
