"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { industryIds } from "@/lib/content";
import { site } from "@/config/site";

type Status = "idle" | "sending" | "success" | "error" | "invalid" | "limited";

const needIds = ["check", "pilot", "deploy", "care", "labeling", "robotics", "other"] as const;
const timelineIds = ["now", "quarter", "later", "exploring"] as const;
const budgetIds = ["b1", "b2", "b3", "b4", "unknown"] as const;

export default function ContactForm({ need = "check" }: { need?: (typeof needIds)[number] }) {
  const t = useTranslations("contact.form");
  const ind = useTranslations("industries");
  const ch = useTranslations("contact.channels");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus(res.status === 400 ? "invalid" : res.status === 429 ? "limited" : "error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center rounded-xl border border-lime/40 bg-lime/5 p-10 text-center" role="status">
        <CheckCircle2 className="size-10 text-lime" aria-hidden="true" />
        <p className="mt-4 text-lg">{t("success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-panel/60 p-6 sm:p-8" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("name")} *</span>
          <input name="name" required maxLength={120} autoComplete="name" className="field" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("company")}</span>
          <input name="company" maxLength={160} autoComplete="organization" className="field" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("email")} *</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("phone")}</span>
          <input name="phone" maxLength={80} autoComplete="tel" className="field" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("industry")}</span>
          <select name="industry" defaultValue="" className="field">
            <option value="">{t("industryPlaceholder")}</option>
            {industryIds.map((id) => (
              <option key={id} value={id}>
                {ind(`${id}.name`)}
              </option>
            ))}
            <option value="other">{t("other")}</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("need")}</span>
          <select name="need" defaultValue={need} className="field">
            {needIds.map((id) => (
              <option key={id} value={id}>
                {t(`needs.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("cameras")}</span>
          <input name="cameras" maxLength={60} placeholder={t("camerasPlaceholder")} className="field placeholder:text-dim" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">{t("timeline")}</span>
          <select name="timeline" defaultValue="" className="field">
            <option value="">{t("industryPlaceholder")}</option>
            {timelineIds.map((id) => (
              <option key={id} value={id}>
                {t(`timelines.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted">{t("budget")}</span>
          <select name="budget" defaultValue="" className="field">
            <option value="">{t("industryPlaceholder")}</option>
            {budgetIds.map((id) => (
              <option key={id} value={id}>
                {t(`budgets.${id}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">{t("message")} *</span>
        <textarea
          name="message"
          required
          maxLength={5000}
          rows={5}
          placeholder={t("messagePlaceholder")}
          className="field resize-y placeholder:text-dim"
        />
        <span className="mt-1.5 block text-xs text-dim">{t("filesHint")}</span>
      </label>
      {/* Honeypot: hidden from people, tempting to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {(status === "error" || status === "invalid" || status === "limited") && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <span>
            {status === "invalid" ? t("invalid") : status === "limited" ? t("limited") : t("error")}{" "}
            {status === "error" && site.telegram && (
              <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="text-cyan underline">
                {ch("telegram")}
              </a>
            )}
            {status === "error" && site.telegram && site.email && " · "}
            {status === "error" && site.email && (
              <a href={`mailto:${site.email}`} className="text-cyan underline">
                {site.email}
              </a>
            )}
          </span>
        </p>
      )}

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-dim">{t("consent")}</p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-6 py-3 text-sm font-semibold text-bg transition hover:bg-cyan-hi disabled:opacity-60 sm:w-auto"
        >
          {status === "sending" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {status === "sending" ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}
