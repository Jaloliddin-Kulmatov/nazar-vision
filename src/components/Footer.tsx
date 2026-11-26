import { useTranslations } from "next-intl";
import { Mail, Send, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import Logo from "./Logo";
import { footerItems } from "./nav";

export default function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const contact = useTranslations("contact.channels");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-bg-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted">{t("tagline")}</p>
          <p className="flex max-w-sm items-start gap-2 text-xs text-dim">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
            {t("privacy")}
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-text">{t("explore")}</h2>
          <ul className="space-y-2 text-sm">
            {footerItems.filter((i) => i.key !== "contact").map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-muted hover:text-text">
                  {nav(i.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-text">{nav("contact")}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2 text-muted hover:text-text">
                <Mail className="size-4" aria-hidden="true" /> {site.email}
              </a>
            </li>
            <li>
              <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted hover:text-text">
                <Send className="size-4" aria-hidden="true" /> {contact("telegram")}
              </a>
            </li>
            <li>
              <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted hover:text-text">
                <MessageCircle className="size-4" aria-hidden="true" /> {contact("whatsapp")}
              </a>
            </li>
            <li>
              <Link href="/contact" className="font-semibold text-cyan hover:text-cyan-hi">
                {nav("cta")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-dim sm:px-6">
          © {year} {site.name}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
