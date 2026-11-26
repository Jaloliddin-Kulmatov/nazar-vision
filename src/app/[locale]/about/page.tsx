import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Lock, Unlock, Sun } from "lucide-react";
import { Container, PageHero, Section, SectionHeader, Card } from "@/components/ui";
import { DemoCards, TwoPaths } from "@/components/sections";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

const icons = [BadgeCheck, Lock, Unlock, Sun];

export default function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("about");
  const h = useTranslations("home.demos");
  const principles = t.raw("principles.items") as { title: string; text: string }[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <SectionHeader title={t("principles.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p, i) => {
            const Icon = icons[i];
            return (
              <Card key={p.title}>
                <Icon className="mb-5 size-6 text-cyan" aria-hidden="true" />
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.text}</p>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section className="border-y border-line bg-bg-2">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title={t("stack.title")} />
            <ul className="flex flex-wrap gap-2">
              {t("stack.text")
                .replace(/\.$/, "")
                .split(", ")
                .map((tool) => (
                  <li key={tool} className="rounded-lg border border-line bg-panel px-3 py-1.5 font-mono text-xs text-muted">
                    {tool}
                  </li>
                ))}
            </ul>
          </div>
          <div className="self-center rounded-xl border border-lime/30 bg-lime/5 p-6 text-muted">
            {t("honesty")}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow={h("eyebrow")} title={h("title")} />
        <DemoCards only={["object-detection", "ocr", "defect-check"]} />
      </Section>

      <Container className="pb-24">
        <TwoPaths />
      </Container>
    </>
  );
}
