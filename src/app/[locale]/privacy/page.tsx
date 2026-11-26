import type { Metadata } from "next";
import { use } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default function Page({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <LegalPage namespace="privacy" />;
}
