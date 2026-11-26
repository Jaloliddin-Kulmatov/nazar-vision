import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHero, Section } from "@/components/ui";
import { OfferLadder } from "@/components/services";
import UseCaseExplorer, { type UseCaseCard } from "@/components/UseCaseExplorer";
import { industryIds, useCases } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/use-cases">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "useCases" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default function UseCasesPage({ params }: PageProps<"/[locale]/use-cases">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("useCases");
  const o = useTranslations("offers");
  const ind = useTranslations("industries");
  const d = useTranslations("demos.items");

  const cases: UseCaseCard[] = useCases.map((u) => ({
    id: u.id,
    industry: u.industry,
    industryName: ind(`${u.industry}.name`),
    title: t(`items.${u.id}.title`),
    problem: t(`items.${u.id}.problem`),
    how: t(`items.${u.id}.how`),
    kpi: t(`items.${u.id}.kpi`),
    effort: u.effort,
    effortLabel: t(`effort.${u.effort}`),
    demo: u.demo ? { slug: u.demo, title: d(`${u.demo}.title`) } : undefined,
  }));
  const industries = industryIds
    .map((id) => ({ id, name: ind(`${id}.name`), count: useCases.filter((u) => u.industry === id).length }))
    .filter((i) => i.count > 0);

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        <UseCaseExplorer
          cases={cases}
          industries={industries}
          labels={{
            all: t("all"),
            problem: t("problem"),
            how: t("how"),
            kpi: t("kpi"),
            tryDemo: t("tryDemo"),
            count: t.raw("count") as string,
          }}
        />
        <p className="mt-8 text-sm text-dim">{t("effortNote")}</p>
      </Container>
      <Section className="border-t border-line bg-bg-2">
        <h2 className="mb-3 font-display text-2xl font-semibold sm:text-3xl">{t("ctaTitle")}</h2>
        <p className="mb-10 max-w-2xl text-muted">{o("subtitle")}</p>
        <OfferLadder compact />
      </Section>
    </>
  );
}
