#!/usr/bin/env node
// Refreshes src/data/repos.json from the GitHub REST API.
// Uses GITHUB_TOKEN if set, otherwise `gh auth token`, otherwise unauthenticated (60 req/h).
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { catalog } from "./catalog.mjs";

const out = fileURLToPath(new URL("../src/data/repos.json", import.meta.url));

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const headers = { Accept: "application/vnd.github+json", "User-Agent": "cv-site-repo-catalog" };
const tk = token();
if (tk) headers.Authorization = `Bearer ${tk}`;

const previous = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")).repos : [];
const prevByName = new Map(previous.map((r) => [r.name.toLowerCase(), r]));

const results = [];
const failed = [];

for (const [task, names] of Object.entries(catalog)) {
  for (const name of names) {
    const res = await fetch(`https://api.github.com/repos/${name}`, { headers });
    if (!res.ok) {
      failed.push(`${name} (${res.status})`);
      const old = prevByName.get(name.toLowerCase());
      if (old) results.push({ ...old, task });
      continue;
    }
    const d = await res.json();
    results.push({
      name: d.full_name,
      url: d.html_url,
      stars: d.stargazers_count,
      license: d.license?.spdx_id ?? "NONE",
      pushedAt: (d.pushed_at ?? "").slice(0, 10),
      archived: Boolean(d.archived),
      description: (d.description ?? "").trim(),
      task,
    });
  }
}

// De-duplicate (renamed repos can resolve to the same canonical name).
const unique = [...new Map(results.map((r) => [r.name.toLowerCase(), r])).values()];
writeFileSync(out, JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 10), repos: unique }, null, 2) + "\n");
console.log(`Wrote ${unique.length} repos to src/data/repos.json`);
if (failed.length) console.warn(`Could not refresh: ${failed.join(", ")}`);
