import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarCheck, Clock } from "lucide-react";
import { ButtonLink, PageHero, Section, SectionHeader } from "@/components/ui";
import { ClientChecklist, PilotPack } from "@/components/services";
import { DemoCards } from "@/components/sections";
import { WhyNazar } from "@/components/trust";
import type { DemoSlug } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/pilot">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pilot" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

/** Tasks that fit a two-week pilot with ready models (custom defect models take longer). */
const quickTasks: DemoSlug[] = ["people-counter", "safety-zone", "ppe-check", "plate-reader", "fire-smoke", "fall-detection", "left-behind", "queue-dwell"];

export default function PilotPage({ params }: PageProps<"/[locale]/pilot">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("pilot");
  const s = useTranslations("services");
  const days = t.raw("days") as { when: string; title: string; text: string }[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <SectionHeader title={t("planTitle")} subtitle={t("planSubtitle")} />
            <ul className="-mt-4 space-y-3 text-sm">
              {(t.raw("facts") as string[]).map((f) => (
                <li key={f} className="flex gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact?need=pilot" className="mt-8">
              <CalendarCheck className="size-4" aria-hidden="true" /> {t("cta")}
            </ButtonLink>
          </div>
          <ol className="relative space-y-4 border-l border-line pl-6">
            {days.map((d, i) => (
              <li key={d.title} className="relative">
                <span className="tabular absolute -left-[37px] grid size-6 place-items-center rounded-full border border-cyan bg-bg text-xs font-bold text-cyan">{i + 1}</span>
                <p className="text-xs font-semibold uppercase tracking-wide text-dim">{d.when}</p>
                <p className="mt-1 font-semibold">{d.title}</p>
                <p className="mt-1 text-sm text-muted">{d.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section className="border-y border-line bg-bg-2">
        <SectionHeader eyebrow={s("pilotPack.eyebrow")} title={s("pilotPack.title")} subtitle={s("pilotPack.subtitle")} />
        <PilotPack />
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <SectionHeader title={t("fitTitle")} subtitle={t("fitSubtitle")} />
          </div>
          <ClientChecklist />
        </div>
        <div className="mt-10">
          <DemoCards only={quickTasks} />
        </div>
      </Section>

      <Section className="border-t border-line bg-bg-2">
        <SectionHeader title={t("whyTitle")} />
        <WhyNazar withCta={false} />
        <div className="mt-10">
          <ButtonLink href="/contact?need=pilot">{t("cta")}</ButtonLink>
        </div>
      </Section>
    </>
  );
}
