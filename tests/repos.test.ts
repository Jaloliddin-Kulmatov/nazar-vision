import { describe, expect, it } from "vitest";
import { filterRepos, isStale, licenseClass, repos, type Repo } from "@/lib/repos";

const sample: Repo[] = [
  { name: "ultralytics/ultralytics", url: "", stars: 63000, license: "AGPL-3.0", pushedAt: "2026-11-24", archived: false, description: "YOLO", task: "detection" },
  { name: "PaddlePaddle/PaddleOCR", url: "", stars: 93000, license: "Apache-2.0", pushedAt: "2026-09-16", archived: false, description: "Turn any PDF or image into data", task: "ocr" },
  { name: "openai/CLIP", url: "", stars: 34000, license: "MIT", pushedAt: "2024-03-25", archived: false, description: "Contrastive pretraining", task: "foundation" },
  { name: "deepinsight/insightface", url: "", stars: 30000, license: "NONE", pushedAt: "2026-10-19", archived: false, description: "Face analysis", task: "pose-face" },
];

describe("licenseClass", () => {
  it("treats AGPL and GPL as copyleft", () => {
    expect(licenseClass("AGPL-3.0")).toBe("copyleft");
    expect(licenseClass("GPL-3.0")).toBe("copyleft");
  });
  it("treats MIT, Apache and BSD as permissive", () => {
    expect(licenseClass("Apache-2.0")).toBe("permissive");
    expect(licenseClass("MIT")).toBe("permissive");
    expect(licenseClass("BSD-3-Clause")).toBe("permissive");
  });
  it("treats missing or custom licences as unknown", () => {
    expect(licenseClass("NONE")).toBe("unknown");
    expect(licenseClass("NOASSERTION")).toBe("unknown");
  });
});

describe("filterRepos", () => {
  const base = { q: "", task: "all" as const, commercialOnly: false, sort: "stars" as const };

  it("sorts by stars descending by default", () => {
    expect(filterRepos(sample, base).map((r) => r.name)[0]).toBe("PaddlePaddle/PaddleOCR");
  });
  it("commercialOnly drops AGPL and unknown licences", () => {
    const names = filterRepos(sample, { ...base, commercialOnly: true }).map((r) => r.name);
    expect(names).not.toContain("ultralytics/ultralytics");
    expect(names).not.toContain("deepinsight/insightface");
    expect(names).toContain("openai/CLIP");
  });
  it("search matches name, description and task case-insensitively", () => {
    expect(filterRepos(sample, { ...base, q: "OCR" }).map((r) => r.name)).toEqual(["PaddlePaddle/PaddleOCR"]);
    expect(filterRepos(sample, { ...base, q: "yolo" }).map((r) => r.name)).toEqual(["ultralytics/ultralytics"]);
  });
  it("filters by task", () => {
    expect(filterRepos(sample, { ...base, task: "foundation" })).toHaveLength(1);
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterRepos(sample, { ...base, q: "zzz-nothing", commercialOnly: true })).toEqual([]);
  });
  it("sorts by most recently updated", () => {
    expect(filterRepos(sample, { ...base, sort: "updated" })[0].name).toBe("ultralytics/ultralytics");
  });
});

describe("isStale", () => {
  it("flags repos without a push for over a year", () => {
    expect(isStale("2024-08-09", new Date("2026-11-24"))).toBe(true);
    expect(isStale("2026-06-01", new Date("2026-11-24"))).toBe(false);
  });
});

describe("bundled data", () => {
  it("has at least 60 repos, each with a task and a unique name", () => {
    expect(repos.length).toBeGreaterThanOrEqual(60);
    expect(new Set(repos.map((r) => r.name)).size).toBe(repos.length);
    for (const r of repos) expect(r.task).toBeTruthy();
  });
});
