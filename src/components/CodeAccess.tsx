"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2, LogOut, MailCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { browserClient } from "@/lib/supabase/client";
import { ButtonLink } from "./ui";

type Status = "checking" | "signedOut" | "sent" | "signedIn" | "unavailable";

/** Sign-up form, or the download button once the visitor is signed in. */
export default function CodeAccess({ kitSize }: { kitSize: string }) {
  const t = useTranslations("code.access");
  const locale = useLocale();
  const supabase = useMemo(() => browserClient(), []);
  const [status, setStatus] = useState<Status>(supabase ? "checking" : "unavailable");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("signin"),
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setStatus(data.user ? "signedIn" : "signedOut");
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setStatus("signedIn");
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setBusy(true);
    setError(null);
    const next = `/${locale}/code`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        data: { name: String(form.get("name") ?? "").trim(), company: String(form.get("company") ?? "").trim() },
      },
    });
    setBusy(false);
    if (err) return setError(err.status === 429 ? t("tooMany") : t("failed"));
    setStatus("sent");
  };

  if (status === "checking") {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-line bg-panel/60">
        <Loader2 className="size-6 animate-spin text-cyan" aria-hidden="true" />
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="rounded-xl border border-line bg-panel/60 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">{t("soonTitle")}</h2>
        <p className="mt-3 text-muted">{t("soonText")}</p>
        <ButtonLink href="/contact" className="mt-6">
          {t("soonCta")}
        </ButtonLink>
      </div>
    );
  }

  if (status === "signedIn" && user) {
    return (
      <div className="rounded-xl border border-cyan bg-panel p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">{t("readyTitle")}</h2>
        <p className="mt-2 text-muted">{t("readyText", { email: user.email ?? "" })}</p>
        <a
          href={`/api/code?locale=${locale}`}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-5 py-2.5 font-semibold text-bg hover:bg-cyan-hi"
        >
          <Download className="size-4" aria-hidden="true" /> {t("download", { size: kitSize })}
        </a>
        <button
          type="button"
          onClick={async () => {
            await supabase?.auth.signOut();
            setUser(null);
            setStatus("signedOut");
          }}
          className="ml-3 mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm hover:border-text"
        >
          <LogOut className="size-4" aria-hidden="true" /> {t("signOut")}
        </button>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-lime/40 bg-lime/5 p-6 sm:p-8" role="status">
        <MailCheck className="size-8 text-lime" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-bold">{t("sentTitle")}</h2>
        <p className="mt-2 text-muted">{t("sentText")}</p>
        <button type="button" onClick={() => setStatus("signedOut")} className="mt-5 text-sm font-semibold text-cyan hover:text-cyan-hi">
          {t("useAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-panel/60 p-6 sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-bold">{t("formTitle")}</h2>
        <p className="mt-2 text-muted">{t("formText")}</p>
      </div>
      {notice === "failed" && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm" role="alert">
          {t("linkFailed")}
        </p>
      )}
      {notice === "required" && <p className="rounded-lg border border-line-strong bg-bg-2 p-3 text-sm">{t("required")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("name")}</span>
          <input name="name" required maxLength={120} autoComplete="name" className="field" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("company")}</span>
          <input name="company" maxLength={160} autoComplete="organization" className="field" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">{t("email")}</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
      </label>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan px-5 font-semibold text-bg hover:bg-cyan-hi disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {t("submit")}
      </button>
      <p className="text-xs text-dim">{t("privacy")}</p>
    </form>
  );
}
