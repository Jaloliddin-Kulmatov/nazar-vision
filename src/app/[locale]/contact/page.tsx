import type { Metadata } from "next";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Send, MessageCircle, Mail, ArrowUpRight } from "lucide-react";
import { Container, PageHero } from "@/components/ui";
import ContactForm from "@/components/ContactForm";
import { Faq } from "@/components/sections";
import { site } from "@/config/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

const needs = ["check", "pilot", "deploy", "care", "labeling", "robotics", "other"] as const;

export default function ContactPage({ params, searchParams }: PageProps<"/[locale]/contact">) {
  const { locale } = use(params);
  const { need } = use(searchParams);
  const preset = needs.find((n) => n === need);
  setRequestLocale(locale);
  const t = useTranslations("contact");
  const p = useTranslations("pricing");

  // Only the channels that are actually set up (see src/config/site.ts).
  const channels = [
    site.telegram && { href: site.telegram, label: t("channels.telegram"), icon: Send, accent: true },
    site.bookCall && { href: site.bookCall, label: t("channels.call"), icon: CalendarDays, accent: !site.telegram },
    site.whatsapp && { href: site.whatsapp, label: t("channels.whatsapp"), icon: MessageCircle, accent: false },
    site.email && { href: `mailto:${site.email}`, label: `${t("channels.email")} · ${site.email}`, icon: Mail, accent: false },
  ].filter((c) => !!c);

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm need={preset} />
        <aside className="space-y-4">
          {channels.length > 0 && <h2 className="font-display text-lg font-semibold">{t("channels.title")}</h2>}
          <ul className="space-y-3">
            {channels.map(({ href, label, icon: Icon, accent }) => (
              <li key={label}>
                <a
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className={`group flex items-center gap-3 rounded-xl border p-4 transition ${
                    accent ? "border-cyan/50 bg-cyan/10 hover:border-lime" : "border-line bg-panel/60 hover:border-line-strong"
                  }`}
                >
                  <Icon className={`size-5 shrink-0 ${accent ? "text-cyan" : "text-muted"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-words text-sm">{label}</span>
                  <ArrowUpRight className="size-4 text-dim group-hover:text-cyan" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </Container>
      <Container className="max-w-3xl pb-24">
        <h2 className="mb-6 font-display text-2xl font-semibold">{p("faqTitle")}</h2>
        <Faq />
      </Container>
    </>
  );
}
