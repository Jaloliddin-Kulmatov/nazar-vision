import type { Metadata } from "next";
import { statSync } from "node:fs";
import path from "node:path";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Container, PageHero, Section, SectionHeader } from "@/components/ui";
import CodeAccess from "@/components/CodeAccess";
import { demos } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/code">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "code" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

/** Size of the generated download, shown on the button. */
function kitSize() {
  try {
    const bytes = statSync(path.join(process.cwd(), ".code-kit", "nazar-vision-demos.zip")).size;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  } catch {
    return "ZIP";
  }
}

export default function CodePage({ params }: PageProps<"/[locale]/code">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("code");
  const d = useTranslations("demos");
  const included = t.raw("included") as string[];
  const steps = t.raw("steps") as { title: string; cmd?: string; text: string }[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-16">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold">{t("includedTitle")}</h2>
          <ul className="mt-5 space-y-3">
            {included.map((it) => (
              <li key={it} className="flex gap-3">
                <Check className="mt-1 size-4 shrink-0 text-lime" aria-hidden="true" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-8 text-sm font-semibold text-muted">{t("demosTitle", { n: demos.length })}</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {demos.map((demo) => (
              <li key={demo.slug} className="rounded-md border border-line px-2.5 py-1 text-sm text-muted">
                {d(`items.${demo.slug}.title`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <CodeAccess kitSize={kitSize()} />
        </div>
      </Container>

      <Section className="border-t border-line bg-bg-2">
        <SectionHeader title={t("runTitle")} subtitle={t("runSubtitle")} />
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-line bg-panel/60 p-5">
              <span className="tabular grid size-8 place-items-center rounded-full border border-line-strong text-sm font-bold text-muted">{i + 1}</span>
              <p className="mt-4 font-semibold">{s.title}</p>
              {s.cmd && <code className="mt-2 block overflow-x-auto rounded-md bg-bg px-3 py-2 font-mono text-[13px] text-cyan">{s.cmd}</code>}
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl text-sm text-dim">{t("licence")}</p>
      </Section>
    </>
  );
}
