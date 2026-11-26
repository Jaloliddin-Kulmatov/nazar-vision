import { useTranslations } from "next-intl";
import { Container, PageHero } from "@/components/ui";

/** Privacy policy and terms: plain sections from the messages file. */
export default function LegalPage({ namespace }: { namespace: "privacy" | "terms" }) {
  const t = useTranslations(namespace);
  const sections = t.raw("sections") as { title: string; items: string[] }[];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="max-w-3xl py-12 sm:py-16">
        <p className="text-sm text-dim">{t("updated")}</p>
        {sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="font-display text-xl font-bold">{s.title}</h2>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
              {s.items.map((it) => (
                <li key={it} className="flex gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-cyan" aria-hidden="true" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
