"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** "Sign in" in the header, or the signed-in person's account. Hidden until accounts are switched on. */
export default function AccountLink({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const [me, setMe] = useState<{ enabled: boolean; email: string | null } | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .then(setMe)
        .catch(() => setMe(null));
    load();
    window.addEventListener("nv-account", load);
    return () => window.removeEventListener("nv-account", load);
  }, []);

  if (!me?.enabled) return null;
  return (
    <Link
      href="/account"
      onClick={onNavigate}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[15px] text-muted hover:text-text ${className}`}
      title={me.email ?? undefined}
    >
      <UserRound className="size-4" aria-hidden="true" />
      {me.email ? t("account") : t("signIn")}
    </Link>
  );
}
