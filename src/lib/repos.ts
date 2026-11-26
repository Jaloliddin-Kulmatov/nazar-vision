import data from "@/data/repos.json";

export const repoTasks = [
  "detection", "segmentation", "foundation", "pose-face", "ocr",
  "tracking", "data", "deploy", "image", "robotics", "3d",
] as const;
export type RepoTask = (typeof repoTasks)[number];

export type Repo = {
  name: string;
  url: string;
  stars: number;
  license: string;
  pushedAt: string;
  archived: boolean;
  description: string;
  task: RepoTask;
};

export type LicenseClass = "permissive" | "copyleft" | "unknown";

export type RepoFilter = {
  q: string;
  task: RepoTask | "all";
  commercialOnly: boolean;
  sort: "stars" | "updated" | "name";
};

export const repos = data.repos as Repo[];
export const reposUpdatedAt = data.updatedAt;

const PERMISSIVE = /^(MIT|Apache-2\.0|BSD-[23]-Clause|ISC|Unlicense|0BSD|Zlib|MPL-2\.0)$/i;
const COPYLEFT = /^(A?GPL|LGPL)/i;

export function licenseClass(license: string): LicenseClass {
  if (PERMISSIVE.test(license)) return "permissive";
  if (COPYLEFT.test(license)) return "copyleft";
  return "unknown";
}

export function isStale(pushedAt: string, now: Date = new Date()): boolean {
  const pushed = new Date(pushedAt).getTime();
  if (Number.isNaN(pushed)) return true;
  return now.getTime() - pushed > 365 * 24 * 60 * 60 * 1000;
}

export function filterRepos(list: Repo[], f: RepoFilter): Repo[] {
  const q = f.q.trim().toLowerCase();
  const out = list.filter((r) => {
    if (f.task !== "all" && r.task !== f.task) return false;
    if (f.commercialOnly && licenseClass(r.license) !== "permissive") return false;
    if (!q) return true;
    return `${r.name} ${r.description} ${r.task}`.toLowerCase().includes(q);
  });
  const byName = (a: Repo, b: Repo) => a.name.localeCompare(b.name);
  if (f.sort === "name") return out.sort(byName);
  if (f.sort === "updated") return out.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt) || byName(a, b));
  return out.sort((a, b) => b.stars - a.stars || byName(a, b));
}
