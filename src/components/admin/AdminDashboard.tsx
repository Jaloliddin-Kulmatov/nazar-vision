"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, LogOut, RefreshCw, Trash2 } from "lucide-react";

type Count = { key: string; n: number };
type Stats = {
  days: number;
  totals: { pageviews: number; visits: number; demo_runs: number; demo_errors: number; contacts: number; signups: number; downloads: number; allSignups: number };
  daily: { day: string; visits: number; pageviews: number; demo_runs: number; signups: number }[];
  pages: Count[];
  demos: { demo: string; runs: number; webcam: number; uploads: number; errors: number }[];
  sources: Count[];
  countries: Count[];
  devices: Count[];
  locales: Count[];
  referrers: Count[];
  signupsOpen: boolean;
};
type Signup = { id: string; name: string; email: string; company: string; provider: string; email_verified: boolean; created_at: string; last_seen_at: string; downloads: number };
type Load = { status: "loading" } | { status: "login"; error?: string } | { status: "error"; error: string } | { status: "ready"; stats: Stats; signups: Signup[] };

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const SOURCE_LABEL: Record<string, string> = {
  auto: "Opened the page (auto-start)",
  link: "Scene link from home page",
  sample: "Clicked a sample",
  webcam: "Own webcam",
  upload: "Own photo or video",
};
const ERROR_TEXT: Record<string, string> = {
  no_admin_password: "Set ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.",
  no_database: "Set DATABASE_URL in Vercel so visits and sign-ups can be stored.",
  db_error: "The database didn't answer. Check DATABASE_URL (use Supabase's Session pooler link).",
};

/** Owner dashboard: traffic, demo use, sign-ups, and the switches that control them. */
export default function AdminDashboard() {
  const d = useTranslations("demos");
  const [days, setDays] = useState(30);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (period: number) => {
    const res = await fetch(`/api/admin/stats?days=${period}`, { cache: "no-store" }).catch(() => null);
    if (!res) return setLoad({ status: "error", error: "db_error" });
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; stats?: Stats; signups?: Signup[] };
    if (res.status === 401) return setLoad({ status: "login" });
    if (!out.ok || !out.stats) return setLoad({ status: "error", error: out.error ?? "db_error" });
    setLoad({ status: "ready", stats: out.stats, signups: out.signups ?? [] });
  }, []);

  useEffect(() => {
    // Fetching on mount is the point of this effect; the state update happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(days);
  }, [days, refresh]);

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    setBusy(false);
    if (out?.ok) return refresh(days);
    setLoad({ status: out?.error === "not_configured" ? "error" : "login", error: out?.error === "not_configured" ? "no_admin_password" : "Wrong password." });
  };

  if (load.status === "loading") {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-cyan" aria-hidden="true" />
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className="max-w-xl rounded-xl border border-line bg-panel/60 p-6">
        <h2 className="font-display text-xl font-bold">The dashboard isn’t set up yet</h2>
        <p className="mt-2 text-muted">{ERROR_TEXT[load.error] ?? ERROR_TEXT.db_error}</p>
      </div>
    );
  }

  if (load.status === "login") {
    return (
      <form onSubmit={login} className="max-w-sm space-y-4 rounded-xl border border-line bg-panel/60 p-6">
        <h2 className="font-display text-xl font-bold">Owner sign-in</h2>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Admin password</span>
          <input name="password" type="password" required autoComplete="current-password" className="field" autoFocus />
        </label>
        {load.error && (
          <p className="text-sm text-danger" role="alert">
            {load.error}
          </p>
        )}
        <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan font-semibold text-bg hover:bg-cyan-hi disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Open dashboard
        </button>
      </form>
    );
  }

  const { stats, signups } = load;
  const t = stats.totals;
  const demoTitle = (slug: string) => (d.has(`items.${slug}.title`) ? d(`items.${slug}.title`) : slug);

  const toggleSignups = async () => {
    setBusy(true);
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signupsOpen: !stats.signupsOpen }) });
    await refresh(days);
    setBusy(false);
  };
  const remove = async (s: Signup) => {
    if (!window.confirm(`Delete ${s.name} (${s.email}) and their download history? This can't be undone.`)) return;
    await fetch(`/api/admin/signups/${s.id}`, { method: "DELETE" });
    await refresh(days);
  };

  const tiles: [string, number, string?][] = [
    ["Visits", t.visits, "Unique visitors per day, added up"],
    ["Page views", t.pageviews],
    ["Demo runs", t.demo_runs],
    ["Sign-ups", t.signups, `${t.allSignups} in total`],
    ["Code downloads", t.downloads],
    ["Contact messages", t.contacts],
    ["Demo errors", t.demo_errors, "Model, camera or file failures"],
  ];

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line-strong p-1" role="group" aria-label="Period">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              aria-pressed={days === n}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${days === n ? "bg-cyan text-bg" : "text-muted hover:text-text"}`}
            >
              {n} days
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void refresh(days)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm hover:border-text">
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh
        </button>
        <a href="/api/admin/signups" download className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm hover:border-text">
          <Download className="size-4" aria-hidden="true" /> Export sign-ups (CSV)
        </a>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            setLoad({ status: "login" });
          }}
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted hover:text-text"
        >
          <LogOut className="size-4" aria-hidden="true" /> Log out
        </button>
      </div>

      {/* Headline numbers */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map(([label, value, hint]) => (
          <li key={label} className="rounded-xl border border-line bg-panel/60 p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="tabular mt-1 font-display text-3xl font-bold">{value.toLocaleString("en-US")}</p>
            {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
          </li>
        ))}
      </ul>

      <DailyChart daily={stats.daily} />

      {/* Switches */}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Accept new sign-ups</h2>
          <p className="mt-1 text-sm text-muted">
            {stats.signupsOpen ? "Anyone can sign up for the free code." : "Paused: only people who already signed up can sign in and download."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={stats.signupsOpen}
          onClick={toggleSignups}
          disabled={busy}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${stats.signupsOpen ? "bg-lime" : "bg-line-strong"}`}
        >
          <span className={`absolute top-1 size-6 rounded-full bg-text transition-all ${stats.signupsOpen ? "left-7" : "left-1"}`} />
          <span className="sr-only">Accept new sign-ups</span>
        </button>
      </section>

      {/* Demos */}
      <section className="rounded-xl border border-line bg-panel/60 p-5">
        <h2 className="font-display text-lg font-bold">Demos people tried</h2>
        {stats.demos.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No demo runs in this period yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-dim">
                <tr>
                  <th className="py-2 font-medium">Demo</th>
                  <th className="py-2 text-right font-medium">Runs</th>
                  <th className="py-2 text-right font-medium">Own webcam</th>
                  <th className="py-2 text-right font-medium">Own files</th>
                  <th className="py-2 text-right font-medium">Errors</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {stats.demos.map((r) => (
                  <tr key={r.demo} className="border-t border-line">
                    <td className="py-2">{demoTitle(r.demo)}</td>
                    <td className="py-2 text-right font-semibold">{r.runs}</td>
                    <td className="py-2 text-right">{r.webcam}</td>
                    <td className="py-2 text-right">{r.uploads}</td>
                    <td className={`py-2 text-right ${r.errors ? "text-danger" : "text-dim"}`}>{r.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TopList title="Most viewed pages" rows={stats.pages} />
        <TopList title="How demos were started" rows={stats.sources.map((r) => ({ ...r, key: SOURCE_LABEL[r.key] ?? r.key }))} />
        <TopList title="Countries" rows={stats.countries} empty="Shown once the site runs on Vercel." />
        <TopList title="Came from" rows={stats.referrers} empty="Direct visits only so far." />
        <TopList title="Devices" rows={stats.devices} />
        <TopList title="Site language" rows={stats.locales.map((r) => ({ ...r, key: r.key.toUpperCase() }))} />
      </div>

      {/* People */}
      <section className="rounded-xl border border-line bg-panel/60 p-5">
        <h2 className="font-display text-lg font-bold">People who signed up ({signups.length})</h2>
        {signups.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No sign-ups yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-dim">
                <tr>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Company</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Via</th>
                  <th className="py-2 font-medium">Signed up</th>
                  <th className="py-2 font-medium">Last seen</th>
                  <th className="py-2 text-right font-medium">Downloads</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-muted">{s.company || "—"}</td>
                    <td className="py-2">
                      <a href={`mailto:${s.email}`} className="text-cyan hover:text-cyan-hi">
                        {s.email}
                      </a>
                    </td>
                    <td className="py-2">
                      <span className="text-muted">{s.provider === "google" ? "Google" : "Email"}</span>
                      {s.email_verified ? (
                        <span className="ml-2 rounded bg-lime/10 px-1.5 py-0.5 text-xs text-lime">confirmed</span>
                      ) : (
                        <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-xs text-dim">not confirmed</span>
                      )}
                    </td>
                    <td className="tabular py-2 text-muted">{fmtDate(s.created_at)}</td>
                    <td className="tabular py-2 text-muted">{fmtDate(s.last_seen_at)}</td>
                    <td className="tabular py-2 text-right">{s.downloads}</td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => void remove(s)} className="rounded-md p-2 text-dim hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${s.email}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-dim">
        Visits are counted without cookies: each visitor gets an anonymous ID that changes every day, and IP addresses are never stored. Bots are left out.
      </p>
    </div>
  );
}

function TopList({ title, rows, empty = "Nothing yet." }: { title: string; rows: Count[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="rounded-xl border border-line bg-panel/60 p-5">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="relative overflow-hidden rounded-md px-2 py-1.5">
              <span className="absolute inset-y-0 left-0 rounded-md bg-cyan/12" style={{ width: `${(r.n / max) * 100}%` }} aria-hidden="true" />
              <span className="relative flex justify-between gap-3">
                <span className="truncate">{r.key}</span>
                <span className="tabular font-semibold">{r.n}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Visits per day as bars, demo runs as a line on the same scale. */
function DailyChart({ daily }: { daily: Stats["daily"] }) {
  const W = 760;
  const H = 200;
  const pad = { l: 36, r: 8, t: 12, b: 24 };
  const max = Math.max(4, ...daily.map((d) => Math.max(d.visits, d.demo_runs)));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const step = iw / Math.max(1, daily.length);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = daily.map((d, i) => `${i ? "L" : "M"}${pad.l + step * i + step / 2},${y(d.demo_runs)}`).join(" ");
  const ticks = [0, Math.round(max / 2), max];
  const labelEvery = Math.ceil(daily.length / 8);

  return (
    <section className="rounded-xl border border-line bg-panel/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Day by day</h2>
        <div className="flex gap-4 text-sm text-muted">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-cyan" aria-hidden="true" /> Visits
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded bg-pink" aria-hidden="true" /> Demo runs
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Visits and demo runs per day">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--dim)">
              {v}
            </text>
          </g>
        ))}
        {daily.map((d, i) => (
          <g key={d.day}>
            <rect x={pad.l + step * i + step * 0.15} y={y(d.visits)} width={step * 0.7} height={pad.t + ih - y(d.visits)} rx="2" fill="var(--cyan)" opacity="0.85">
              <title>{`${d.day}: ${d.visits} visits, ${d.demo_runs} demo runs, ${d.signups} sign-ups`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={pad.l + step * i + step / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--dim)">
                {d.day.slice(5)}
              </text>
            )}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--pink)" strokeWidth="2" />
      </svg>
    </section>
  );
}
