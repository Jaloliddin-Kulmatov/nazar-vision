import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ShieldCheck, Star, Scale, Play } from "lucide-react";
import { Container, Section, SectionHeader, ButtonLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import HeroLive from "@/components/HeroLive";
import { Faq, IndustryGrid, ServicesGrid, TwoPaths } from "@/components/sections";
import { OfferLadder } from "@/components/services";
import { repos } from "@/lib/repos";

/** Scenes on the home page: each opens its demo already running on that clip. */
const scenes = [
  { slug: "safety-zone", sample: "warehouseVideo", poster: "/posters/warehouse.jpg" },
  { slug: "ppe-check", sample: "hardhatFrame", poster: "/posters/hardhat.jpg" },
  { slug: "people-counter", sample: "conveyorVideo", poster: "/posters/conveyor.jpg" },
  { slug: "fatigue-monitor", sample: "driverVideo", poster: "/posters/driver.jpg" },
  { slug: "object-detection", sample: "trafficVideo", poster: "/posters/traffic.jpg" },
  { slug: "face-anonymizer", sample: "crowdVideo", poster: "/posters/crowd.jpg" },
] as const;

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");
  const p = useTranslations("pricing");
  const o = useTranslations("offers");
  const d = useTranslations("demos");

  const topRepos = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 6);

  return (
    <>
      {/* Hero: real footage, real detections */}
      <section className="relative overflow-hidden border-b border-line">
        <Container className="grid gap-x-14 gap-y-7 pb-14 pt-8 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:pb-20">
          <div className="hero-in min-w-0 self-end">
            <h1 className="max-w-[15ch] font-display text-[2.2rem] font-bold leading-[1.04] text-balance sm:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted text-pretty sm:mt-6 sm:text-lg">{t("hero.subtitle")}</p>
          </div>
          <div className="hero-in min-w-0 [animation-delay:120ms] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <HeroLive />
          </div>
          <div className="hero-in min-w-0 self-start">
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/demos/safety-zone?sample=warehouseVideo">
                <Play className="size-4" aria-hidden="true" /> {t("hero.primary")}
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                {t("hero.secondary")}
              </ButtonLink>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm text-dim">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
              {t("hero.note")}
            </p>
          </div>
        </Container>
      </section>

      {/* Scenes: one click from here to a running model */}
      <Section>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeader title={t("scenes.title")} subtitle={t("scenes.subtitle")} />
          <ButtonLink href="/demos" variant="ghost" className="mb-10 shrink-0">
            {t("scenes.all")}
          </ButtonLink>
        </div>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {scenes.map((sc) => (
            <li key={sc.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <Link
                href={`/demos/${sc.slug}?sample=${sc.sample}`}
                className="group relative block aspect-[16/10] overflow-hidden rounded-xl border border-line bg-panel-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sc.poster} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                <span className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/30 to-transparent" aria-hidden="true" />
                <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-bold leading-tight">{d(`items.${sc.slug}.title`)}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted">{t(`scenes.items.${sc.slug}`)}</span>
                  </span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan text-bg transition-transform group-hover:scale-110">
                    <Play className="size-4 translate-x-px" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeader eyebrow={o("eyebrow")} title={o("title")} subtitle={o("subtitle")} />
        <OfferLadder compact />
      </Section>

      <Section className="border-y border-line bg-bg-2">
        <SectionHeader eyebrow={t("industries.eyebrow")} title={t("industries.title")} subtitle={t("industries.subtitle")} />
        <IndustryGrid />
      </Section>

      <Section>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeader eyebrow={t("services.eyebrow")} title={t("services.title")} />
          <ButtonLink href="/services" variant="ghost" className="mb-10 shrink-0">
            {t("services.cta")}
          </ButtonLink>
        </div>
        <ServicesGrid />
      </Section>

      {/* Open source teaser */}
      <Section className="border-y border-line bg-bg-2">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeader eyebrow={t("oss.eyebrow")} title={t("oss.title")} subtitle={t("oss.text")} />
            <ButtonLink href="/open-source" variant="ghost" className="-mt-2">
              {t("oss.cta")}
            </ButtonLink>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {topRepos.map((r) => (
              <li key={r.name} className="rounded-xl border border-line bg-panel/60 p-4">
                <p className="truncate font-mono text-sm text-text">{r.name}</p>
                <p className="mt-2 flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5 text-amber" aria-hidden="true" />
                    {(r.stars / 1000).toFixed(1)}k
                  </span>
                  <span className="flex items-center gap-1">
                    <Scale className="size-3.5" aria-hidden="true" />
                    {r.license}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <SectionHeader eyebrow="FAQ" title={p("faqTitle")} />
          <Faq />
        </div>
      </Section>

      <Section className="pt-0">
        <TwoPaths />
      </Section>
    </>
  );
}
