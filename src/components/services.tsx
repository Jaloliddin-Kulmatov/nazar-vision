import { useTranslations } from "next-intl";
import {
  Check, Camera, Cpu, Plug, ClipboardCheck, FileSearch, Scale, Bug, Gauge, Code2, ListChecks, FileSignature,
  ShieldAlert, Wrench,
} from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { site } from "@/config/site";

const offerIds = ["check", "pilot", "deploy", "care"] as const;
const offerPrice: Record<(typeof offerIds)[number], string | null> = {
  check: null,
  pilot: site.prices.pilot,
  deploy: site.prices.deployment,
  care: site.prices.care,
};

/** The four ways to start working with us, cheapest and least risky first. */
export function OfferLadder({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("offers");
  return (
    <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {offerIds.map((id, i) => {
        const price = offerPrice[id];
        const featured = id === "pilot";
        return (
          <li
            key={id}
            className={`relative flex min-w-0 flex-col rounded-xl border p-6 ${
              featured ? "border-cyan bg-panel" : "border-line bg-panel/50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`tabular grid size-9 place-items-center rounded-full font-display text-base font-bold ${featured ? "bg-cyan text-bg" : "border border-line-strong text-muted"}`}>{i + 1}</span>
              <span className="text-sm text-dim">
                {t(`${id}.time`)}
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-bold">{t(`${id}.name`)}</h3>
            <p className={`mt-1 font-display text-2xl font-bold ${price ? "text-text" : "text-lime"}`}>
              {price ? t(`${id}.price`, { price }) : t(`${id}.price`)}
            </p>
            <p className={`mt-3 text-[15px] text-muted ${compact ? "flex-1" : ""}`}>{t(`${id}.outcome`)}</p>
            {!compact && (
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {(t.raw(`${id}.points`) as string[]).map((p) => (
                  <li key={p} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            <ButtonLink href="/contact" variant={featured ? "primary" : "ghost"} className={compact ? "mt-5" : "mt-6"}>
              {t(`${id}.cta`)}
            </ButtonLink>
          </li>
        );
      })}
    </ol>
  );
}

const packIcons = [FileSignature, ClipboardCheck, Scale, Bug, Gauge, Code2, ListChecks, FileSearch];

/** What every pilot hands over: evidence for a decision, owned by the client. */
export function PilotPack() {
  const t = useTranslations("services.pilotPack");
  const items = t.raw("items") as { title: string; text: string }[];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => {
        const Icon = packIcons[i % packIcons.length];
        return (
          <li key={it.title} className="rounded-xl border border-line bg-panel/60 p-5">
            <Icon className="size-5 text-cyan" aria-hidden="true" />
            <p className="mt-3 font-semibold">{it.title}</p>
            <p className="mt-1.5 text-sm text-muted">{it.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function FailureModes() {
  const t = useTranslations("services.risks");
  const items = t.raw("items") as { risk: string; fix: string }[];
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel/50">
      {items.map((it) => (
        <li key={it.risk} className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-8">
          <p className="flex gap-3 font-semibold">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            {it.risk}
          </p>
          <p className="flex gap-3 text-sm text-muted">
            <Wrench className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
            {it.fix}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ClientChecklist() {
  const t = useTranslations("services.needs");
  return (
    <div className="rounded-xl border border-line bg-panel/60 p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold">{t("title")}</h3>
      <ul className="mt-5 space-y-3">
        {(t.raw("items") as string[]).map((it) => (
          <li key={it} className="flex gap-3 text-sm">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-cyan/60">
              <Check className="size-3.5 text-cyan" aria-hidden="true" />
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

const stackIcons = [Camera, Cpu, Plug];

export function HardwareStack() {
  const t = useTranslations("services.hardware");
  const groups = t.raw("groups") as { title: string; items: string[]; note: string }[];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((g, i) => {
          const Icon = stackIcons[i % stackIcons.length];
          return (
            <div key={g.title} className="flex min-w-0 flex-col rounded-xl border border-line bg-panel/60 p-6">
              <Icon className="size-6 text-cyan" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-bold">{g.title}</h3>
              <ul className="mt-3 flex-1 space-y-2 text-sm text-muted">
                {g.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-cyan" aria-hidden="true" />
                    {it}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-bg-2 px-3 py-2 text-sm font-medium text-cyan">{g.note}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-dim">{t("compare")}</p>
    </>
  );
}
