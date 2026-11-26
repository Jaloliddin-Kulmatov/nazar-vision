import type { Metadata, Viewport } from "next";
import { Geologica, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { site } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageViews from "@/components/PageViews";
import TelegramButton from "@/components/TelegramButton";
import "../globals.css";

const geologica = Geologica({
  subsets: ["latin", "latin-ext", "cyrillic"],
  axes: ["SHRP"],
  variable: "--font-geologica",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0b1424",
  colorScheme: "dark",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(site.url),
    title: { default: t("title"), template: `%s · ${site.name}` },
    description: t("description"),
    // Language versions of every page are listed in /sitemap.xml (per page, not just the home page).
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: site.name,
      type: "website",
      locale: { en: "en_US", uz: "uz_UZ", ru: "ru_RU" }[locale] ?? "en_US",
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

function organizationLd(locale: string) {
  const sameAs = [site.telegram, site.github].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: `${site.url}/${locale}`,
    description: "Computer vision systems for factories, warehouses, shops and sites: safety alerts, counting, number plates, quality checks.",
    areaServed: "UZ",
    knowsLanguage: ["uz", "ru", "en"],
    ...(sameAs.length ? { sameAs } : {}),
    ...(site.email ? { email: site.email, contactPoint: { "@type": "ContactPoint", contactType: "sales", email: site.email, availableLanguage: ["Uzbek", "Russian", "English"] } } : {}),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geologica.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh flex flex-col">
        <script
          type="application/ld+json"
          // Company details for search engines (name, site, languages, contact channels that are set up).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd(locale)).replace(/</g, "\\u003c") }}
        />
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <PageViews />
          <TelegramButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
