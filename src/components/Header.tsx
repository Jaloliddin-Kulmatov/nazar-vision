"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import Logo from "./Logo";
import LangSwitch from "./LangSwitch";
import { footerItems, navItems } from "./nav";

export default function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled || open ? "bg-bg/90 backdrop-blur-xl border-b border-line" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-[15px] transition-colors ${
                isActive(item.href) ? "bg-panel text-text" : "text-muted hover:text-text"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link
            href="/contact"
            className="hidden sm:inline-flex items-center whitespace-nowrap rounded-lg bg-cyan px-4 py-2 text-[15px] font-semibold text-bg transition-colors hover:bg-cyan-hi"
          >
            {t("cta")}
          </Link>
          <button
            type="button"
            className="lg:hidden rounded-lg p-2 text-muted hover:text-text"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t("close") : t("menu")}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-line px-4 pb-6 pt-2" aria-label="Mobile">
          {footerItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-3 text-base ${
                isActive(item.href) ? "bg-panel text-text" : "text-muted"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="mt-3 flex justify-center rounded-lg bg-cyan px-4 py-3 font-semibold text-bg hover:bg-cyan-hi"
          >
            {t("cta")}
          </Link>
        </nav>
      )}
    </header>
  );
}
