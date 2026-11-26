import { defineRouting } from "next-intl/routing";

export const locales = ["en", "uz", "ru"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  uz: "O‘zbekcha",
  ru: "Русский",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
});
