/**
 * Fall and "person down" detection from body pose, one monitor per tracked person.
 *
 * A fall is a quick change from upright to lying (torso near horizontal) while the hips drop,
 * followed by staying down for a moment. Someone lying down for a long time without a fall
 * raises a softer "person down" alert. Bending over or squatting raises nothing.
 */

export type PoseSample = {
  t: number;
  /** Torso angle from vertical in degrees: 0 standing, 90 lying. */
  tilt: number;
  /** Hip height in the frame, 0 = top, 1 = bottom. */
  hipY: number;
  /** Width / height of the body's bounding box. */
  aspect: number;
};

export type FallState = "upright" | "down" | "fallen";
export type FallEvent = "fall" | "lying";

export type FallOptions = {
  uprightTilt: number;
  downTilt: number;
  /** How recently the person must have been upright for a drop to count as a fall. */
  dropWindowMs: number;
  /** How far the hips must drop, as a fraction of frame height. */
  minDrop: number;
  /** How long they must stay down before the fall alert. */
  confirmMs: number;
  /** How long someone may lie still before the "person down" alert. */
  lyingMs: number;
};

export const FALL_DEFAULTS: FallOptions = { uprightTilt: 35, downTilt: 60, dropWindowMs: 1500, minDrop: 0.08, confirmMs: 1000, lyingMs: 4000 };

/**
 * Lying = torso tipped over AND the body's outline wider than it is tall (or very wide on its own).
 * Someone bending over has a tipped torso but standing legs, so their outline stays tall.
 */
export function isLying(s: Omit<PoseSample, "t">, o: FallOptions = FALL_DEFAULTS): boolean {
  return (s.tilt >= o.downTilt && s.aspect >= 0.9) || s.aspect >= 1.3;
}

export class FallMonitor {
  state: FallState = "upright";
  private history: PoseSample[] = [];
  private downSince: number | null = null;
  private sudden = false;
  private alerted = false;

  constructor(private o: FallOptions = FALL_DEFAULTS) {}

  /** Feed one pose; returns an event the moment an alert fires. */
  update(s: PoseSample): FallEvent | null {
    this.history.push(s);
    while (this.history.length && this.history[0].t < s.t - 3000) this.history.shift();

    const isDown = isLying(s, this.o);
    if (!isDown) {
      if (s.tilt <= this.o.uprightTilt) {
        this.state = "upright";
        this.alerted = false;
      }
      this.downSince = null;
      this.sudden = false;
      return null;
    }

    if (this.downSince === null) {
      this.downSince = s.t;
      // Was this person standing a moment ago, with the hips clearly higher?
      this.sudden = this.history.some(
        (h) => h.t >= s.t - this.o.dropWindowMs && h.tilt <= this.o.uprightTilt && h.aspect < 1 && s.hipY - h.hipY >= this.o.minDrop,
      );
    }
    const downFor = s.t - this.downSince;
    if (this.alerted) return null;
    if (this.sudden && downFor >= this.o.confirmMs) {
      this.alerted = true;
      this.state = "fallen";
      return "fall";
    }
    if (downFor >= this.o.lyingMs) {
      this.alerted = true;
      this.state = "down";
      return "lying";
    }
    return null;
  }

  /** Time spent down so far, for the on-screen timer. */
  downFor(now: number) {
    return this.downSince === null ? 0 : now - this.downSince;
  }
}
