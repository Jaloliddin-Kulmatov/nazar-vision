import { useTranslations } from "next-intl";
import { ButtonLink, Container } from "@/components/ui";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <div className="bbox mb-8 rounded-xl border border-dashed border-line-strong p-8">
        <LogoMark className="size-16 opacity-60" />
      </div>
      <p className="tabular text-sm text-pink">404 · 0 objects detected</p>
      <h1 className="mt-3 font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("text")}</p>
      <ButtonLink href="/" className="mt-8">{t("home")}</ButtonLink>
    </Container>
  );
}
