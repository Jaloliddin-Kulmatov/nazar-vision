export type FatigueAlert = "none" | "drowsy" | "microsleep";
export type FatigueState = {
  eyesClosed: boolean;
  /** How long the eyes have been closed right now, in ms. */
  closedMs: number;
  blinks: number;
  yawns: number;
  /** PERCLOS: share of the recent window with eyes closed (0–1). */
  perclos: number;
  alert: FatigueAlert;
};

type Opts = {
  closeThr: number;
  yawnThr: number;
  microsleepMs: number;
  yawnMinMs: number;
  windowMs: number;
  perclosAlert: number;
};

const DEFAULTS: Opts = {
  closeThr: 0.5,
  yawnThr: 0.5,
  microsleepMs: 1500,
  yawnMinMs: 800,
  windowMs: 30_000,
  perclosAlert: 0.15,
};

/** Turns per-frame eye-closure and jaw-open scores (0–1, e.g. MediaPipe blendshapes) into fatigue signals. */
export class FatigueTracker {
  blinks = 0;
  yawns = 0;
  private o: Opts;
  private closedSince: number | null = null;
  private yawnSince: number | null = null;
  private yawnCounted = false;
  private samples: { t: number; closed: boolean }[] = [];
  private yawnTimes: number[] = [];

  constructor(opts: Partial<Opts> = {}) {
    this.o = { ...DEFAULTS, ...opts };
  }

  update(now: number, eyeClosure: number, jawOpen: number): FatigueState {
    const { o } = this;
    const closed = eyeClosure >= o.closeThr;

    if (closed && this.closedSince === null) this.closedSince = now;
    if (!closed && this.closedSince !== null) {
      if (now - this.closedSince < o.microsleepMs) this.blinks++;
      this.closedSince = null;
    }

    if (jawOpen >= o.yawnThr) {
      this.yawnSince ??= now;
      if (!this.yawnCounted && now - this.yawnSince >= o.yawnMinMs) {
        this.yawns++;
        this.yawnTimes.push(now);
        this.yawnCounted = true;
      }
    } else {
      this.yawnSince = null;
      this.yawnCounted = false;
    }

    this.samples.push({ t: now, closed });
    while (this.samples.length && now - this.samples[0].t > o.windowMs) this.samples.shift();
    this.yawnTimes = this.yawnTimes.filter((t) => now - t <= o.windowMs);
    const span = this.samples.length > 1 ? now - this.samples[0].t : 0;
    const perclos = this.samples.length ? this.samples.filter((s) => s.closed).length / this.samples.length : 0;

    const closedMs = this.closedSince === null ? 0 : now - this.closedSince;
    let alert: FatigueAlert = "none";
    if (closedMs >= o.microsleepMs) alert = "microsleep";
    else if ((span >= 5000 && perclos >= o.perclosAlert) || this.yawnTimes.length >= 3) alert = "drowsy";

    return { eyesClosed: closed, closedMs, blinks: this.blinks, yawns: this.yawns, perclos, alert };
  }

  reset() {
    this.blinks = 0;
    this.yawns = 0;
    this.closedSince = null;
    this.yawnSince = null;
    this.yawnCounted = false;
    this.samples = [];
    this.yawnTimes = [];
  }
}
