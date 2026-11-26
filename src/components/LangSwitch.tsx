"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/routing";

export default function LangSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="relative flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted focus-within:border-cyan hover:border-line-strong">
      <Globe className="size-4" aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <span className="text-xs font-semibold uppercase text-text" aria-hidden="true">
        {locale}
      </span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            router.replace(
              // @ts-expect-error -- params always match the current pathname
              { pathname, params },
              { locale: next },
            );
          });
        }}
        aria-label={t("language")}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-panel text-text normal-case">
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
