import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import { TwoPaths, useDemoCards } from "@/components/sections";
import DemoLab from "@/components/DemoLab";
import { demoGroups } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/demos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demos" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default function DemosPage({ params }: PageProps<"/[locale]/demos">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("demos");
  const c = useTranslations("common");
  const { items, labels } = useDemoCards();
  const groups = demoGroups.map((id) => ({ id, label: t(`groups.${id}`) }));

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        <DemoLab items={items} groups={groups} labels={labels} allLabel={t("groups.all")} />
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border border-line bg-panel/60 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-bold">{t("codeBand.title")}</p>
            <p className="mt-1 text-muted">{t("codeBand.text")}</p>
          </div>
          <ButtonLink href="/code" className="shrink-0">
            {t("getCode")}
          </ButtonLink>
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="size-4 text-lime" aria-hidden="true" /> {c("privacy")}
        </p>
      </Container>
      <Container className="pb-24">
        <TwoPaths />
      </Container>
    </>
  );
}
