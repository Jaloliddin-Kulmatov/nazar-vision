import { useTranslations } from "next-intl";
import { Check, Minus, X } from "lucide-react";
import { ButtonLink } from "@/components/ui";

type Mark = "yes" | "partly" | "no";
type Row = { topic: string; us: string; them: string; mark: Mark };

const markIcon = {
  yes: <Check className="size-4 shrink-0 text-lime" aria-hidden="true" />,
  partly: <Minus className="size-4 shrink-0 text-amber" aria-hidden="true" />,
  no: <X className="size-4 shrink-0 text-danger" aria-hidden="true" />,
};

/**
 * How working with us differs from the usual video-analytics offer.
 * No competitor is named: the right column describes common practice in the market.
 */
export function WhyNazar({ withCta = true }: { withCta?: boolean }) {
  const t = useTranslations("why");
  const rows = t.raw("rows") as Row[];
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] gap-4 border-b border-line bg-panel px-5 py-3 text-sm font-semibold md:grid">
          <span className="text-dim">{t("colTopic")}</span>
          <span className="text-cyan">{t("colUs")}</span>
          <span className="text-muted">{t("colThem")}</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.topic} className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] md:gap-4">
              <p className="font-semibold">{r.topic}</p>
              <p className="flex gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                <span>
                  <span className="sr-only">{t("colUs")}: </span>
                  {r.us}
                </span>
              </p>
              <p className="flex gap-2 text-sm text-muted">
                <span className="mt-0.5">{markIcon[r.mark]}</span>
                <span>
                  <span className="font-medium text-dim md:sr-only">{t("colThem")}: </span>
                  {r.them}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-xs text-dim">{t("note")}</p>
      {withCta && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/pilot">{t("ctaPilot")}</ButtonLink>
          <ButtonLink href="/demos" variant="ghost">
            {t("ctaDemos")}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
