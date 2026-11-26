import type { Metadata } from "next";
import { statSync } from "node:fs";
import path from "node:path";
import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHero } from "@/components/ui";
import CodeAccess from "@/components/CodeAccess";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("eyebrow"), robots: { index: false } };
}

function kitSize() {
  try {
    return `${Math.max(1, Math.round(statSync(path.join(process.cwd(), ".code-kit", "nazar-vision-demos.zip")).size / 1024))} KB`;
  } catch {
    return "ZIP";
  }
}

export default function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("account");
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="max-w-2xl py-12">
        <CodeAccess kitSize={kitSize()} initialMode="signin" />
        <p className="mt-6 text-sm text-muted">
          {t("whatIsIt")}{" "}
          <Link href="/code" className="font-semibold text-cyan hover:text-cyan-hi">
            {t("seeCode")}
          </Link>
        </p>
      </Container>
    </>
  );
}
