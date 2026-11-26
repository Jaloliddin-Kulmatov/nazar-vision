export type RoiInput = {
  /** People doing manual visual checks, per shift. */
  inspectors: number;
  shifts: number;
  /** Full monthly cost of one inspector (salary + taxes), USD. */
  monthlyCost: number;
  /** Share of the checking work the system takes over, 0–1. */
  automated: number;
  /** Defects or incidents that slip through today, per month. */
  escapes: number;
  /** Cost of one escape (rework, return, claim, downtime), USD. */
  escapeCost: number;
  /** Share of escapes the system prevents, 0–1. */
  caught: number;
  /** One-off project cost (pilot + deployment + hardware), USD. */
  projectCost: number;
  /** Running cost per month (support plan), USD. */
  runningCost: number;
};

export type RoiResult = {
  labourSaving: number;
  qualitySaving: number;
  /** Net monthly saving after running costs. */
  monthly: number;
  /** Net first-year saving after the one-off cost. */
  firstYear: number;
  /** Months to pay back the one-off cost; null if it never pays back. */
  paybackMonths: number | null;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const pos = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);

/** A deliberately simple, transparent estimate: labour freed plus escapes prevented, minus running cost. */
export function estimateRoi(i: RoiInput): RoiResult {
  const labourSaving = pos(i.inspectors) * pos(i.shifts) * pos(i.monthlyCost) * clamp01(i.automated);
  const qualitySaving = pos(i.escapes) * pos(i.escapeCost) * clamp01(i.caught);
  const monthly = labourSaving + qualitySaving - pos(i.runningCost);
  const firstYear = monthly * 12 - pos(i.projectCost);
  const paybackMonths = monthly > 0 ? pos(i.projectCost) / monthly : null;
  return { labourSaving, qualitySaving, monthly, firstYear, paybackMonths };
}
