import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { db, databaseUrl } from "./db";

export const ADMIN_COOKIE = "nv_admin";
const ADMIN_HOURS = 12;

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

/** Changing ADMIN_PASSWORD signs every admin out. */
const adminKey = () => createHash("sha256").update(`nazar-vision-admin:${process.env.ADMIN_PASSWORD}:${databaseUrl()}`).digest("hex");

const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

export const passwordMatches = (given: string) => adminConfigured() && same(given, process.env.ADMIN_PASSWORD!);

export function adminToken(now = Date.now()) {
  const exp = String(now + ADMIN_HOURS * 3_600_000);
  return `${exp}.${createHmac("sha256", adminKey()).update(exp).digest("base64url")}`;
}

export function isAdmin(req: NextRequest, now = Date.now()): boolean {
  if (!adminConfigured()) return false;
  const [exp, mac] = (req.cookies.get(ADMIN_COOKIE)?.value ?? "").split(".");
  if (!exp || !mac || Number(exp) < now) return false;
  return same(mac, createHmac("sha256", adminKey()).update(exp).digest("base64url"));
}

export function setAdminCookie(res: NextResponse, secure: boolean) {
  res.cookies.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: ADMIN_HOURS * 3600 });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

type Count = { key: string; n: number };

/** Everything the dashboard shows for the last `days` days. */
export async function adminStats(days: number) {
  const s = await db();
  const since = new Date(Date.now() - days * 86_400_000);
  const ev = s`nazar_vision.events`;

  const [totals] = await s<{ pageviews: number; visits: number; demo_runs: number; demo_errors: number; contacts: number }[]>`
    select
      count(*) filter (where type = 'pageview')::int as pageviews,
      count(distinct (visitor, at::date)) filter (where type = 'pageview')::int as visits,
      count(*) filter (where type = 'demo_run')::int as demo_runs,
      count(*) filter (where type = 'demo_error')::int as demo_errors,
      count(*) filter (where type = 'contact')::int as contacts
    from ${ev} where at >= ${since}`;
  const [{ signups }] = await s<{ signups: number }[]>`select count(*)::int as signups from nazar_vision.signups where created_at >= ${since}`;
  const [{ downloads }] = await s<{ downloads: number }[]>`select count(*)::int as downloads from nazar_vision.code_downloads where created_at >= ${since}`;
  const [{ all_signups }] = await s<{ all_signups: number }[]>`select count(*)::int as all_signups from nazar_vision.signups`;

  const daily = await s<{ day: string; visits: number; pageviews: number; demo_runs: number; signups: number }[]>`
    with days as (
      select generate_series(date_trunc('day', ${since}::timestamptz), date_trunc('day', now()), interval '1 day')::date as day
    )
    select to_char(d.day, 'YYYY-MM-DD') as day,
      (select count(distinct visitor) from ${ev} e where e.type = 'pageview' and e.at::date = d.day)::int as visits,
      (select count(*) from ${ev} e where e.type = 'pageview' and e.at::date = d.day)::int as pageviews,
      (select count(*) from ${ev} e where e.type = 'demo_run' and e.at::date = d.day)::int as demo_runs,
      (select count(*) from nazar_vision.signups u where u.created_at::date = d.day)::int as signups
    from days d order by d.day`;

  const group = (column: "path" | "country" | "device" | "locale" | "referrer" | "source", type: string, limit = 10) => s<Count[]>`
    select ${s(column)} as key, count(*)::int as n from ${ev}
    where at >= ${since} and type = ${type} and ${s(column)} <> ''
    group by 1 order by 2 desc limit ${limit}`;

  const demos = await s<{ demo: string; runs: number; webcam: number; uploads: number; errors: number }[]>`
    select demo,
      count(*) filter (where type = 'demo_run')::int as runs,
      count(*) filter (where type = 'demo_run' and source = 'webcam')::int as webcam,
      count(*) filter (where type = 'demo_run' and source = 'upload')::int as uploads,
      count(*) filter (where type = 'demo_error')::int as errors
    from ${ev} where at >= ${since} and demo <> '' and type in ('demo_run', 'demo_error')
    group by demo order by runs desc`;

  const [pages, countries, devices, locales, referrers, sources] = await Promise.all([
    group("path", "pageview", 12),
    group("country", "pageview"),
    group("device", "pageview", 3),
    group("locale", "pageview", 3),
    group("referrer", "pageview"),
    group("source", "demo_run", 6),
  ]);

  return {
    days,
    totals: { ...totals, signups, downloads, allSignups: all_signups },
    daily,
    pages,
    demos,
    sources,
    countries,
    devices,
    locales,
    referrers,
    signupsOpen: ((await s<{ value: string }[]>`select value from nazar_vision.settings where key = 'signups_open'`)[0]?.value ?? "yes") === "yes",
  };
}

export type SignupListRow = { id: string; name: string; email: string; company: string; created_at: string; last_seen_at: string; downloads: number };

export async function listSignups(limit = 500): Promise<SignupListRow[]> {
  const s = await db();
  return s<SignupListRow[]>`
    select u.id, u.name, u.email, u.company, u.created_at, u.last_seen_at, count(d.id)::int as downloads
    from nazar_vision.signups u left join nazar_vision.code_downloads d on d.signup_id = u.id
    group by u.id order by u.created_at desc limit ${limit}`;
}

export async function deleteSignup(id: string) {
  const s = await db();
  await s`delete from nazar_vision.signups where id = ${id}`;
}

/** CSV with every field quoted; formula-like cells are prefixed so spreadsheets don't run them. */
export function toCsv(rows: SignupListRow[]): string {
  const cell = (v: unknown) => {
    let t = String(v ?? "");
    if (/^[=+\-@]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const head = ["name", "email", "company", "signed_up", "last_seen", "downloads"];
  const body = rows.map((r) => [r.name, r.email, r.company, new Date(r.created_at).toISOString(), new Date(r.last_seen_at).toISOString(), r.downloads].map(cell).join(","));
  return [head.join(","), ...body].join("\n") + "\n";
}
