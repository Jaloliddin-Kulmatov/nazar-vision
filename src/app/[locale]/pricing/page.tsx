import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Container, PageHero, ButtonLink } from "@/components/ui";
import { Faq } from "@/components/sections";
import { site } from "@/config/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

const plans = [
  { id: "feasibility", price: null, featured: false },
  { id: "pilot", price: site.prices.pilot, featured: false },
  { id: "deployment", price: site.prices.deployment, featured: true },
  { id: "enterprise", price: null, featured: false },
] as const;

export default function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("pricing");

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-14">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map(({ id, price, featured }) => (
            <div
              key={id}
              className={`relative flex min-w-0 flex-col rounded-3xl border p-6 sm:p-7 ${
                featured ? "border-cyan/60 bg-gradient-to-b from-cyan/10 to-panel glow-cyan" : "border-line bg-panel/60"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-cyan px-3 py-1 text-xs font-semibold text-bg">
                  {t("popular")}
                </span>
              )}
              <h2 className="font-display text-xl font-semibold">{t(`plans.${id}.name`)}</h2>
              <p className="mt-1 text-sm text-muted">{t(`plans.${id}.desc`)}</p>
              <p className="mt-6">
                {price ? (
                  <>
                    <span className="mr-1.5 text-sm text-muted">{t("from")}</span>
                    <span className="font-display text-3xl font-bold sm:text-4xl">{price}</span>
                    <span className="ml-2 text-sm text-muted">{t(`plans.${id}.price`)}</span>
                  </>
                ) : (
                  <span className={`break-words font-display text-3xl font-bold sm:text-4xl ${id === "feasibility" ? "text-lime" : ""}`}>
                    {t(`plans.${id}.price`)}
                  </span>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {(t.raw(`plans.${id}.features`) as string[]).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/contact" variant={featured ? "primary" : "ghost"} className="mt-8">
                {t(`plans.${id}.cta`)}
              </ButtonLink>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-line bg-panel/60 p-6 md:flex-row md:items-center">
          <div>
            <p className="font-display text-lg font-semibold">
              {t("care.name")} · <span className="text-cyan">{t("care.price", { price: site.prices.care })}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{t("care.desc")}</p>
          </div>
          <a href={`/${locale}/services#roi`} className="shrink-0 rounded-xl border border-line-strong px-5 py-3 text-sm font-semibold hover:border-cyan hover:text-cyan">
            {t("roiLink")} →
          </a>
        </div>
        <p className="mt-6 text-center text-sm text-dim">{t("note")}</p>

        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-6 font-display text-2xl font-semibold">{t("faqTitle")}</h2>
          <Faq />
        </div>
      </Container>
    </>
  );
}
