import { promises as dns } from "node:dns";

export type EmailCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "syntax" | "disposable" | "no_mail_server" | "typo"; suggestion?: string };

const SYNTAX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Mail providers people in Uzbekistan, the CIS and elsewhere use most; a near miss is probably a typo. */
const POPULAR = [
  "gmail.com", "mail.ru", "yandex.ru", "yandex.com", "ya.ru", "inbox.ru", "list.ru", "bk.ru", "rambler.ru",
  "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "me.com", "proton.me", "protonmail.com",
  "umail.uz", "inbox.uz", "mail.uz",
];

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // A swapped pair of letters ("gmial") counts as one mistake.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  }
  return dp[a.length][b.length];
}

/** "ali@gmial.com" → "ali@gmail.com"; null when the domain looks intended. */
export function suggestEmail(email: string): string | null {
  const [user, domain] = email.split("@");
  if (!user || !domain || POPULAR.includes(domain)) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const p of POPULAR) {
    const d = distance(domain, p);
    if (d < bestD && d <= (p.length > 6 ? 2 : 1)) {
      best = p;
      bestD = d;
    }
  }
  return best ? `${user}@${best}` : null;
}

let disposable: { exact: Set<string>; wildcard: string[] } | null = null;
async function disposableLists() {
  if (!disposable) {
    const [exact, wildcard] = await Promise.all([
      import("disposable-email-domains").then((m) => m.default as string[]),
      import("disposable-email-domains/wildcard.json").then((m) => m.default as string[]),
    ]);
    disposable = { exact: new Set(exact), wildcard };
  }
  return disposable;
}

/** Throwaway inboxes (mailinator, 10minutemail…): about 120,000 known domains. */
export async function isDisposable(domain: string): Promise<boolean> {
  const { exact, wildcard } = await disposableLists();
  return exact.has(domain) || wildcard.some((w) => domain === w || domain.endsWith(`.${w}`));
}

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms))]);

/** Whether the domain can receive mail (MX records, or an address record as the fallback mail host). */
export async function canReceiveMail(domain: string): Promise<boolean> {
  const missing = (e: unknown) => ["ENOTFOUND", "ENODATA", "ESERVFAIL"].includes((e as { code?: string }).code ?? "");
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 3000);
    if (mx.some((r) => r.exchange && r.exchange !== ".")) return true;
    return false; // A "null MX" record says the domain takes no mail.
  } catch (e) {
    if (!missing(e)) return true; // DNS trouble on our side: don't turn people away.
  }
  try {
    const a = await withTimeout(dns.resolve4(domain), 3000);
    return a.length > 0;
  } catch (e) {
    return !missing(e);
  }
}

/**
 * The full check used on sign-up and sign-in. `acceptTypo` lets someone keep an
 * address we thought was a typo (e.g. a real company domain that looks like gmail).
 */
export async function checkEmail(raw: string, acceptTypo = false): Promise<EmailCheck> {
  const email = raw.trim().toLowerCase();
  if (email.length > 200 || !SYNTAX.test(email)) return { ok: false, reason: "syntax" };
  const domain = email.split("@")[1];
  if (await isDisposable(domain)) return { ok: false, reason: "disposable" };
  const suggestion = acceptTypo ? null : suggestEmail(email);
  if (suggestion) return { ok: false, reason: "typo", suggestion };
  if (!(await canReceiveMail(domain))) return { ok: false, reason: "no_mail_server" };
  return { ok: true, email };
}
