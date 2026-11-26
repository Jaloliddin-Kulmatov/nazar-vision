"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2, LogOut, MailCheck, Trash2 } from "lucide-react";
import { ButtonLink } from "./ui";

type Me = { enabled: boolean; signupOpen: boolean; google: boolean; emailCodes: boolean; email: string | null };
type State =
  | { status: "checking" }
  | { status: "unavailable" }
  | { status: "form"; me: Me }
  | { status: "code"; me: Me; email: string }
  | { status: "signedIn"; email: string };
type Mode = "signup" | "signin";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Google or email sign-up/sign-in (with a confirmation code when email is set up), then the download. */
export default function CodeAccess({ kitSize, initialMode = "signup" }: { kitSize: string; initialMode?: Mode }) {
  const t = useTranslations("code.access");
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "checking" });
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastForm = useRef<Record<string, unknown>>({});

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<Me>)
      .then((me) => {
        const signin = new URLSearchParams(window.location.search).get("signin");
        setNotice(signin === "required" ? t("required") : signin === "failed" ? t("googleFailed") : signin === "closed" ? t("closed") : null);
        if (!me.enabled) return setState({ status: "unavailable" });
        if (me.email) return setState({ status: "signedIn", email: me.email });
        setState({ status: "form", me });
        if (!me.signupOpen) setMode("signin");
      })
      .catch(() => setState({ status: "unavailable" }));
  }, [t]);

  const message = (code?: string) => {
    const known = [
      "email_syntax", "email_disposable", "email_no_mail_server", "email_typo", "name_required", "not_found", "closed",
      "too_soon", "too_many", "send_failed", "wrong_code", "expired", "too_many_attempts",
    ];
    return code && known.includes(code) ? t(`errors.${code}`) : t("failed");
  };

  const post = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json()) as { ok: boolean; step?: "code" | "done"; email?: string; error?: string; suggestion?: string };
  };

  const signedIn = (email: string) => {
    setState({ status: "signedIn", email });
    window.dispatchEvent(new Event("nv-account"));
  };

  const start = async (body: Record<string, unknown>) => {
    if (state.status !== "form" && state.status !== "code") return;
    const me = state.me;
    setBusy(true);
    setError(null);
    setSuggestion(null);
    try {
      const out = await post("/api/auth/email/start", { ...body, mode, locale });
      if (out.ok && out.step === "code" && out.email) setState({ status: "code", me, email: out.email });
      else if (out.ok && out.email) signedIn(out.email);
      else {
        setError(message(out.error));
        if (out.suggestion) setSuggestion(out.suggestion);
      }
    } catch {
      setError(t("failed"));
    }
    setBusy(false);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    lastForm.current = Object.fromEntries(new FormData(e.currentTarget));
    void start(lastForm.current);
  };

  const onCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.status !== "code") return;
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true);
    setError(null);
    try {
      const out = await post("/api/auth/email/verify", { email: state.email, code });
      if (out.ok && out.email) signedIn(out.email);
      else setError(message(out.error));
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
              window.dispatchEvent(new Event("nv-account"));
              setMode("signin");
              setState({ status: "checking" });
              const me = (await fetch("/api/me", { cache: "no-store" }).then((r) => r.json())) as Me;
              setState({ status: "form", me });
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm hover:border-text"
          >
            <LogOut className="size-4" aria-hidden="true" /> {t("signOut")}
          </button>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(t("deleteConfirm"))) return;
            const res = await fetch("/api/account/delete", { method: "POST" }).catch(() => null);
            if (!res?.ok) return setError(t("failed"));
            window.dispatchEvent(new Event("nv-account"));
            setMode("signup");
            setNotice(t("deleted"));
            setState({ status: "checking" });
            const me = (await fetch("/api/me", { cache: "no-store" }).then((r) => r.json())) as Me;
            setState({ status: "form", me });
          }}
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-dim underline-offset-2 hover:text-danger hover:underline"
        >
          <Trash2 className="size-3.5" aria-hidden="true" /> {t("deleteAccount")}
        </button>
        {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
      </div>
    );
  }

  if (state.status === "code") {
    return (
      <form onSubmit={onCode} className="space-y-4 rounded-xl border border-line bg-panel/60 p-6 sm:p-8">
        <MailCheck className="size-8 text-lime" aria-hidden="true" />
        <div>
          <h2 className="font-display text-2xl font-bold">{t("codeTitle")}</h2>
          <p className="mt-2 text-muted">{t("codeText", { email: state.email })}</p>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("codeLabel")}</span>
          <input
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            autoFocus
            className="field tabular text-center font-display text-2xl tracking-[0.4em]"
          />
        </label>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan px-5 font-semibold text-bg hover:bg-cyan-hi disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {t("codeSubmit")}
        </button>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <button type="button" disabled={busy} onClick={() => void start(lastForm.current)} className="font-semibold text-cyan hover:text-cyan-hi">
            {t("codeResend")}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setState({ status: "form", me: state.me });
            }}
            className="text-muted hover:text-text"
          >
            {t("codeChange")}
          </button>
        </p>
      </form>
    );
  }

  const me = state.me;
  const signup = mode === "signup";
  return (
    <div className="space-y-4 rounded-xl border border-line bg-panel/60 p-6 sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-bold">{signup ? t("formTitle") : t("signinTitle")}</h2>
        <p className="mt-2 text-muted">{signup ? (me.emailCodes || me.google ? t("formTextCode") : t("formText")) : me.signupOpen ? t("signinText") : t("closed")}</p>
      </div>
      {notice && <p className="rounded-lg border border-line-strong bg-bg-2 p-3 text-sm">{notice}</p>}

      {me.google && (
        <>
          <a
            href={`/api/auth/google?locale=${locale}&next=${encodeURIComponent(window.location.pathname)}`}
            className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-text font-semibold text-bg hover:bg-white"
          >
            <GoogleMark /> {t("google")}
          </a>
          <p className="flex items-center gap-3 text-xs text-dim">
            <span className="h-px flex-1 bg-line" aria-hidden="true" /> {t("orEmail")} <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </p>
        </>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        {signup && (
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
        )}
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("email")}</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
        </label>
        {signup && <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />}
        {error && (
          <div className="text-sm" role="alert">
            <p className="text-danger">{error}</p>
            {suggestion && (
              <p className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-cyan px-3 py-1.5 font-semibold text-cyan hover:bg-cyan/10"
                  onClick={() => {
                    const input = formRef.current?.elements.namedItem("email") as HTMLInputElement | null;
                    if (input) input.value = suggestion;
                    void start({ ...lastForm.current, email: suggestion });
                  }}
                >
                  {t("useSuggestion", { email: suggestion })}
                </button>
                <button type="button" className="rounded-md border border-line-strong px-3 py-1.5 hover:border-text" onClick={() => void start({ ...lastForm.current, acceptTypo: true })}>
                  {t("keepMine")}
                </button>
              </p>
            )}
          </div>
        )}
        <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan px-5 font-semibold text-bg hover:bg-cyan-hi disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {signup ? (me.emailCodes ? t("submitCode") : t("submit")) : me.emailCodes ? t("signinCode") : t("signinSubmit")}
        </button>
      </form>

      {me.signupOpen && (
        <p className="text-sm text-muted">
          {signup ? t("haveAccount") : t("noAccount")}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(signup ? "signin" : "signup");
              setError(null);
              setSuggestion(null);
            }}
            className="font-semibold text-cyan hover:text-cyan-hi"
          >
            {signup ? t("switchSignin") : t("switchSignup")}
          </button>
        </p>
      )}
      {signup && <p className="text-xs text-dim">{t("privacy")}</p>}
    </div>
  );
}
