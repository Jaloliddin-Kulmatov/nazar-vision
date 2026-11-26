"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2, LogOut } from "lucide-react";
import { ButtonLink } from "./ui";

type State = { status: "checking" } | { status: "unavailable" } | { status: "signedOut" } | { status: "signedIn"; email: string };

/** Sign-up form, or the download button once the visitor has signed up on this browser. */
export default function CodeAccess({ kitSize }: { kitSize: string }) {
  const t = useTranslations("code.access");
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "checking" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ enabled: boolean; email: string | null }>)
      .then((me) => {
        setRequired(new URLSearchParams(window.location.search).get("signin") === "required");
        setState(!me.enabled ? { status: "unavailable" } : me.email ? { status: "signedIn", email: me.email } : { status: "signedOut" });
      })
      .catch(() => setState({ status: "unavailable" }));
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const out = (await res.json()) as { ok: boolean; email?: string; error?: string };
      if (out.ok && out.email) setState({ status: "signedIn", email: out.email });
      else setError(out.error === "email_invalid" ? t("emailInvalid") : out.error === "name_required" ? t("nameRequired") : t("failed"));
    } catch {
      setError(t("failed"));
    }
    setBusy(false);
  };

  if (state.status === "checking") {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-line bg-panel/60">
        <Loader2 className="size-6 animate-spin text-cyan" aria-hidden="true" />
      </div>
    );
  }

  if (state.status === "unavailable") {
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

  if (state.status === "signedIn") {
    return (
      <div className="rounded-xl border border-cyan bg-panel p-6 sm:p-8" role="status">
        <h2 className="font-display text-2xl font-bold">{t("readyTitle")}</h2>
        <p className="mt-2 text-muted">{t("readyText", { email: state.email })}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/api/code?locale=${locale}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-5 py-2.5 font-semibold text-bg hover:bg-cyan-hi"
          >
            <Download className="size-4" aria-hidden="true" /> {t("download", { size: kitSize })}
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/signout", { method: "POST" }).catch(() => undefined);
              setState({ status: "signedOut" });
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm hover:border-text"
          >
            <LogOut className="size-4" aria-hidden="true" /> {t("signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-panel/60 p-6 sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-bold">{t("formTitle")}</h2>
        <p className="mt-2 text-muted">{t("formText")}</p>
      </div>
      {required && <p className="rounded-lg border border-line-strong bg-bg-2 p-3 text-sm">{t("required")}</p>}
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
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
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
