"use client";

import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { site } from "@/config/site";

/** Floating "write to us on Telegram" button: Telegram is how most people in Uzbekistan reach a business. */
export default function TelegramButton() {
  const t = useTranslations("contact.channels");
  const path = usePathname();
  // Not on the owner's dashboard, and not while someone is busy with a demo's controls on a phone.
  if (!site.telegram || path.startsWith("/admin") || path.startsWith("/demos/")) return null;
  return (
    <a
      href={site.telegram}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#229ed9] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <Send className="size-4" aria-hidden="true" />
      <span>{t("telegramShort")}</span>
    </a>
  );
}
