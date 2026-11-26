import type { Metadata } from "next";
import { use } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scale } from "lucide-react";
import { Container, PageHero } from "@/components/ui";
import RepoExplorer from "@/components/RepoExplorer";
import { repos, reposUpdatedAt, licenseClass } from "@/lib/repos";

export async function generateMetadata({ params }: PageProps<"/[locale]/open-source">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "oss" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default function OpenSourcePage({ params }: PageProps<"/[locale]/open-source">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("oss");
  const format = useFormatter();

  const counts = {
    permissive: repos.filter((r) => licenseClass(r.license) === "permissive").length,
    copyleft: repos.filter((r) => licenseClass(r.license) === "copyleft").length,
    unknown: repos.filter((r) => licenseClass(r.license) === "unknown").length,
  };

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <div className="grid grid-cols-3 gap-3">
            {(["permissive", "copyleft", "unknown"] as const).map((k) => (
              <div key={k} className="rounded-xl border border-line bg-panel/60 p-4">
                <p
                  className={`font-display text-2xl font-bold ${
                    k === "permissive" ? "text-lime" : k === "copyleft" ? "text-amber" : "text-muted"
                  }`}
                >
                  {counts[k]}
                </p>
                <p className="mt-1 text-xs text-muted">{t(`license.${k}`)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber/30 bg-amber/5 p-5">
            <p className="flex items-center gap-2 font-semibold">
              <Scale className="size-4 text-amber" aria-hidden="true" /> {t("licenseNote.title")}
            </p>
            <p className="mt-2 text-sm text-muted">{t("licenseNote.text")}</p>
          </div>
        </div>
        <p className="mb-4 font-mono text-xs text-dim">
          {t("updated")}: {format.dateTime(new Date(reposUpdatedAt), { dateStyle: "medium" })} · GitHub API
        </p>
        <RepoExplorer repos={repos} />
      </Container>
    </>
  );
}
