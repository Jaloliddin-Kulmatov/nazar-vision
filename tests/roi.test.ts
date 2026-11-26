import { describe, expect, it } from "vitest";
import { estimateRoi } from "@/lib/roi";

const base = {
  inspectors: 4, shifts: 2, monthlyCost: 450, automated: 0.6,
  escapes: 20, escapeCost: 50, caught: 0.5, projectCost: 9000, runningCost: 150,
};

describe("estimateRoi", () => {
  it("adds labour and quality savings and subtracts running cost", () => {
    const r = estimateRoi(base);
    expect(r.labourSaving).toBe(2160);
    expect(r.qualitySaving).toBe(500);
    expect(r.monthly).toBe(2510);
    expect(r.firstYear).toBe(2510 * 12 - 9000);
    expect(r.paybackMonths).toBeCloseTo(9000 / 2510);
  });
  it("returns no payback when savings do not cover running cost", () => {
    expect(estimateRoi({ ...base, inspectors: 0, escapes: 0 }).paybackMonths).toBeNull();
  });
  it("clamps percentages and ignores negative or invalid numbers", () => {
    const r = estimateRoi({ ...base, automated: 3, caught: -1, escapes: Number.NaN, monthlyCost: -5 });
    expect(r.labourSaving).toBe(0);
    expect(r.qualitySaving).toBe(0);
  });
});
