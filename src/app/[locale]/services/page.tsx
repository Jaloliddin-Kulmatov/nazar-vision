import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Section, SectionHeader, ButtonLink } from "@/components/ui";
import { Pipeline, ServicesGrid } from "@/components/sections";
import { ClientChecklist, FailureModes, HardwareStack, OfferLadder, PilotPack } from "@/components/services";
import RoiCalculator from "@/components/RoiCalculator";
import { site } from "@/config/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/services">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

/** Small visual sample for each annotation type. */
function LabelGlyph({ i }: { i: number }) {
  const s = "var(--cyan)";
  const l = "var(--lime)";
  const shapes = [
    <rect key="b" x="8" y="10" width="30" height="22" fill="none" stroke={s} strokeWidth="2" />,
    <polygon key="p" points="8,30 16,10 34,12 40,28 24,34" fill="rgba(255,198,41,.15)" stroke={s} strokeWidth="2" />,
    <path key="m" d="M10 30c2-12 8-20 16-20s12 8 14 20Z" fill="rgba(62,224,160,.35)" stroke={l} strokeWidth="1.5" />,
    <g key="k" stroke={s} strokeWidth="1.5" fill={l}>
      <line x1="24" y1="8" x2="24" y2="22" /><line x1="24" y1="14" x2="14" y2="20" /><line x1="24" y1="14" x2="34" y2="20" />
      <line x1="24" y1="22" x2="18" y2="34" /><line x1="24" y1="22" x2="30" y2="34" />
      <circle cx="24" cy="8" r="2.5" /><circle cx="14" cy="20" r="2" /><circle cx="34" cy="20" r="2" /><circle cx="18" cy="34" r="2" /><circle cx="30" cy="34" r="2" />
    </g>,
    <g key="c"><rect x="8" y="12" width="32" height="18" rx="9" fill="rgba(62,224,160,.15)" stroke={l} strokeWidth="1.5" /><text x="24" y="25" textAnchor="middle" fontSize="9" fill={l} fontFamily="monospace">OK</text></g>,
    <g key="v" fill="none" strokeWidth="1.5"><rect x="6" y="14" width="14" height="14" stroke={s} opacity=".35" /><rect x="16" y="12" width="14" height="14" stroke={s} opacity=".65" /><rect x="27" y="10" width="14" height="14" stroke={s} /></g>,
    <g key="o"><rect x="8" y="14" width="32" height="14" fill="none" stroke={s} strokeWidth="2" /><text x="24" y="24.5" textAnchor="middle" fontSize="8" fill="var(--text)" fontFamily="monospace">AB 123</text></g>,
    <rect key="r" x="12" y="12" width="26" height="16" fill="none" stroke={s} strokeWidth="2" transform="rotate(-20 25 20)" />,
  ];
  return (
    <svg viewBox="0 0 48 40" className="h-10 w-12" aria-hidden="true">
      {shapes[i]}
    </svg>
  );
}

export default function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("services");
  const o = useTranslations("offers");
  const h = useTranslations("home");
  const labelTypes = t.raw("labelTypes.items") as string[];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <Container className="relative pb-14 pt-16 sm:pt-20">
          <SectionHeader as="h1" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
          <div className="-mt-4 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact">{t("cta.primary")}</ButtonLink>
            <a
              href="#roi"
              className="inline-flex items-center justify-center rounded-xl border border-line-strong px-5 py-3 text-sm font-semibold hover:border-cyan hover:text-cyan"
            >
              {t("roi.eyebrow")}
            </a>
          </div>
        </Container>
      </section>

      <Section>
        <SectionHeader eyebrow={o("eyebrow")} title={o("title")} subtitle={o("subtitle")} />
        <OfferLadder />
      </Section>

      <Section className="border-y border-line bg-bg-2">
        <SectionHeader eyebrow={t("linesEyebrow")} title={t("linesTitle")} />
        <ServicesGrid detailed />
      </Section>

      <Section>
        <SectionHeader eyebrow={t("pilotPack.eyebrow")} title={t("pilotPack.title")} subtitle={t("pilotPack.subtitle")} />
        <PilotPack />
      </Section>

      <Section className="border-y border-line bg-bg-2">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <SectionHeader eyebrow={t("risks.eyebrow")} title={t("risks.title")} />
            <FailureModes />
          </div>
          <div className="lg:pt-24">
            <ClientChecklist />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow={t("hardware.eyebrow")} title={t("hardware.title")} subtitle={t("hardware.subtitle")} />
        <HardwareStack />
      </Section>

      <Section id="roi" className="scroll-mt-20 border-y border-line bg-bg-2">
        <SectionHeader eyebrow={t("roi.eyebrow")} title={t("roi.title")} subtitle={t("roi.subtitle")} />
        <RoiCalculator />
      </Section>

      <Section>
        <SectionHeader eyebrow={t("items.labeling.title")} title={t("labelTypes.title")} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {labelTypes.map((name, i) => (
            <li key={name} className="flex items-center gap-3 rounded-xl border border-line bg-panel/70 p-4">
              <LabelGlyph i={i} />
              <span className="text-sm">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="border-t border-line bg-bg-2">
        <SectionHeader eyebrow={h("pipeline.eyebrow")} title={h("pipeline.title")} subtitle={h("pipeline.subtitle")} />
        <Pipeline />
      </Section>

      <Section className="pt-0 bg-bg-2">
        <div className="relative overflow-hidden rounded-3xl border border-cyan/40 bg-gradient-to-br from-cyan/15 via-panel to-lime/10 p-8 sm:p-12">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("cta.title")}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t("cta.text")}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact">{t("cta.primary")}</ButtonLink>
            <a
              href={site.bookCall}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-line-strong px-5 py-3 text-sm font-semibold hover:border-cyan hover:text-cyan"
            >
              {t("cta.secondary")}
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
