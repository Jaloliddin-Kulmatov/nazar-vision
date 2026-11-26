import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Cpu, HardDriveDownload, Briefcase, ExternalLink, Code2, BadgeCheck } from "lucide-react";
import { Container, ButtonLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import DemoLoader from "@/components/demo/DemoLoader";
import { DemoCards } from "@/components/sections";
import { demos, demoSlugs, getDemo, industries, type DemoSlug } from "@/lib/content";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => demoSlugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/demos/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!getDemo(slug)) return {};
  const t = await getTranslations({ locale, namespace: `demos.items.${slug}` });
  return { title: t("title"), description: t("short") };
}

export default function DemoPage({ params }: PageProps<"/[locale]/demos/[slug]">) {
  const { locale, slug } = use(params);
  setRequestLocale(locale);
  const meta = getDemo(slug);
  if (!meta) notFound();

  const t = useTranslations("demos");
  const c = useTranslations("common");
  const ind = useTranslations("industries");
  const Icon = meta.icon;
  const usedIn = industries.filter((i) => i.demos.includes(meta.slug));
  // Same job first (other safety demos for a safety demo), then the rest.
  const others = demos.filter((d) => d.slug !== meta.slug);
  const related = [...others.filter((d) => d.group === meta.group), ...others.filter((d) => d.group !== meta.group)]
    .slice(0, 3)
    .map((d) => d.slug) as DemoSlug[];

  return (
    <>
      <Container className="pb-6 pt-6 sm:pt-8">
        <Link href="/demos" className="mb-5 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden="true" /> {c("backToDemos")}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
              <Icon className="size-8 shrink-0 text-cyan" aria-hidden="true" />
              {t(`items.${meta.slug}.title`)}
            </h1>
            <p className="mt-2 max-w-2xl text-muted">{t(`items.${meta.slug}.short`)}</p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-dim">
            <li className="flex items-center gap-1.5">
              <Cpu className="size-4" aria-hidden="true" /> {meta.model}
            </li>
            <li className="flex items-center gap-1.5">
              <HardDriveDownload className="size-4" aria-hidden="true" /> {t("sizeLabel")}: {meta.size}
            </li>
            <li className="flex items-center gap-1.5" title={t("licenceHint")}>
              <BadgeCheck className="size-4 text-lime" aria-hidden="true" /> {t("licenceLabel", { licence: meta.licence })}
            </li>
          </ul>
        </div>
      </Container>

      <Container className="pb-10">
        <DemoLoader slug={meta.slug} />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel/60 p-6">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
              <Briefcase className="size-5 text-cyan" aria-hidden="true" /> {t("ui.businessUse")}
            </h2>
            <p className="text-muted">{t(`items.${meta.slug}.business`)}</p>
            {usedIn.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {usedIn.map(({ id, icon: IIcon }) => (
                  <Link
                    key={id}
                    href={`/solutions#${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-muted hover:border-text hover:text-text"
                  >
                    <IIcon className="size-3.5" aria-hidden="true" /> {ind(`${id}.name`)}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-line bg-panel/60 p-6">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
              <Cpu className="size-5 text-cyan" aria-hidden="true" /> {t("ui.howItWorks")}
            </h2>
            <ul className="space-y-2 text-sm">
              {meta.repos.map((r) => (
                <li key={r}>
                  <a
                    href={`https://github.com/${r}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[13px] text-muted hover:text-text"
                  >
                    {r} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/code">
                <Code2 className="size-4" aria-hidden="true" /> {t("getCode")}
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                {c("talkToUs")}
              </ButtonLink>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-bold">{t("moreDemos")}</h2>
            <DemoCards only={related} />
          </div>
        )}
      </Container>
    </>
  );
}
