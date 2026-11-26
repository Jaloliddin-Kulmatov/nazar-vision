import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, Check, BarChart3, ArrowRight, Info } from "lucide-react";
import { Container, PageHero, ButtonLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { industries, getDemo } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/solutions">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "solutionsPage" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default function SolutionsPage({ params }: PageProps<"/[locale]/solutions">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("solutionsPage");
  const ind = useTranslations("industries");
  const d = useTranslations("demos.items");
  const c = useTranslations("common");

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

      {/* Jump links */}
      <Container className="pt-8">
        <nav className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]" aria-label={t("eyebrow")}>
          {industries.map(({ id, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-cyan hover:text-cyan"
            >
              <Icon className="size-3.5" aria-hidden="true" /> {ind(`${id}.name`)}
            </a>
          ))}
        </nav>
      </Container>

      <Container className="space-y-6 py-10">
        {industries.map(({ id, icon: Icon, demos }) => (
          <article key={id} id={id} className="scroll-mt-24 rounded-3xl border border-line bg-panel/50 p-6 sm:p-8">
            <header className="mb-8 flex flex-wrap items-center gap-4">
              <span className="grid size-12 place-items-center rounded-xl bg-cyan/10 text-cyan">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold sm:text-2xl">{ind(`${id}.name`)}</h2>
                <p className="text-sm text-lime">{ind(`${id}.outcome`)}</p>
              </div>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {(
                [
                  ["problems", t("problems"), AlertTriangle, "text-amber"],
                  ["solutions", t("weBuild"), Check, "text-cyan"],
                  ["measure", t("measure"), BarChart3, "text-lime"],
                ] as const
              ).map(([key, label, ItemIcon, color]) => (
                <div key={key}>
                  <h3 className="mb-3 tabular text-xs text-dim">{label}</h3>
                  <ul className="space-y-2.5 text-sm">
                    {(ind.raw(`${id}.${key}`) as string[]).map((line) => (
                      <li key={line} className="flex gap-2">
                        <ItemIcon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
              <span className="mr-2 tabular text-xs text-dim">{t("tryDemos")}</span>
              {demos.map((slug) => {
                const meta = getDemo(slug)!;
                return (
                  <Link
                    key={slug}
                    href={`/demos/${slug}`}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/5 px-3 py-1.5 text-xs text-cyan hover:border-lime hover:text-lime"
                  >
                    <meta.icon className="size-3.5" aria-hidden="true" />
                    {d(`${slug}.title`)}
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            {id === "healthcare" && (
              <p className="mt-4 flex items-start gap-2 text-xs text-dim">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {t("disclaimer")}
              </p>
            )}
          </article>
        ))}

        <div className="rounded-3xl border border-cyan/40 bg-gradient-to-br from-cyan/10 to-lime/5 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">{t("notListed")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t("notListedText")}</p>
          <ButtonLink href="/contact" className="mt-6">
            {c("talkToUs")}
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
