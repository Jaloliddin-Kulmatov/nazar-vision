import { useTranslations } from "next-intl";
import { Camera, ScanLine, Workflow, Gauge, Bell, Check, Play, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { demos, industries, serviceDemos, serviceIcons, serviceIds, type DemoSlug } from "@/lib/content";
import { ButtonLink, Card } from "./ui";
import { DemoCard } from "./DemoCard";

export function IndustryGrid() {
  const t = useTranslations("industries");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {industries.map(({ id, icon: Icon }) => (
        <Link
          key={id}
          href={`/solutions#${id}`}
          className="group flex items-start gap-4 rounded-xl border border-line bg-panel/50 p-5 transition-colors hover:border-line-strong hover:bg-panel"
        >
          <Icon className="mt-0.5 size-6 shrink-0 text-cyan" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-display text-lg font-bold leading-snug">{t(`${id}.outcome`)}</span>
            <span className="mt-1 block text-sm text-muted">{t(`${id}.name`)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const pipelineIcons = [Camera, ScanLine, Workflow, Gauge, Bell];

export function Pipeline() {
  const t = useTranslations("home.pipeline");
  const steps = t.raw("steps") as { title: string; text: string }[];
  return (
    <ol className="relative grid gap-4 md:grid-cols-5">
      <div
        className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-cyan/0 via-cyan/60 to-lime/0 md:block"
        aria-hidden="true"
      />
      {steps.map((s, i) => {
        const Icon = pipelineIcons[i];
        return (
          <li key={s.title} className="relative rounded-xl border border-line bg-panel/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-cyan/40 bg-bg text-cyan">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="tabular text-sm text-dim">{i + 1}</span>
            </div>
            <p className="font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Card data for the demos, translated on the server. */
export function useDemoCards(only?: DemoSlug[]) {
  const t = useTranslations("demos");
  const list = only ? only.map((slug) => demos.find((d) => d.slug === slug)!) : demos;
  const items = list.map((d) => ({
    slug: d.slug,
    group: d.group,
    title: t(`items.${d.slug}.title`),
    short: t(`items.${d.slug}.short`),
    cover: d.cover,
    size: d.size,
    live: d.webcam,
  }));
  const labels = { video: t("card.video"), photo: t("card.photo"), download: t.raw("card.download") as string };
  return { items, labels };
}

export function DemoCards({ only }: { only?: DemoSlug[] }) {
  const { items, labels } = useDemoCards(only);
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <DemoCard key={d.slug} d={d} labels={labels} />
      ))}
    </div>
  );
}

export function ServicesGrid({ detailed = false }: { detailed?: boolean }) {
  const t = useTranslations("services.items");
  const d = useTranslations("demos");
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {serviceIds.map((id) => {
        const Icon = serviceIcons[id];
        return (
          <Card key={id}>
            <Icon className="mb-4 size-6 text-cyan" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold">{t(`${id}.title`)}</h3>
            <p className="mt-2 text-sm text-muted">{t(`${id}.text`)}</p>
            {detailed && (
              <ul className="mt-4 space-y-2 text-sm">
                {(t.raw(`${id}.points`) as string[]).map((p) => (
                  <li key={p} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {detailed && serviceDemos[id].length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                {serviceDemos[id].map((slug) => (
                  <Link
                    key={slug}
                    href={`/demos/${slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-muted hover:border-cyan hover:text-text"
                  >
                    <Play className="size-3 text-cyan" aria-hidden="true" /> {d(`items.${slug}.title`)}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function Process() {
  const t = useTranslations("home.process");
  const steps = t.raw("steps") as { title: string; time: string; text: string }[];
  return (
    <ol className="grid gap-4 md:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-xl border border-line bg-panel/60 p-6">
          <span className="font-display text-4xl font-bold text-gradient">{i + 1}</span>
          <p className="mt-3 font-mono text-xs text-lime">{s.time}</p>
          <p className="mt-1 font-semibold">{s.title}</p>
          <p className="mt-2 text-sm text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function Faq() {
  const t = useTranslations("faq");
  const items = t.raw("items") as { q: string; a: string }[];
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it) => (
        <details key={it.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
            {it.q}
            <Plus className="size-5 shrink-0 text-cyan transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export function TwoPaths() {
  const t = useTranslations("home.paths");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[20px] border border-line bg-panel/50 p-8">
        <h3 className="font-display text-2xl font-bold">{t("build.title")}</h3>
        <p className="mt-3 text-muted">{t("build.text")}</p>
        <ButtonLink href="/code" variant="ghost" className="mt-6">
          {t("build.cta")}
        </ButtonLink>
      </div>
      <div className="relative overflow-hidden rounded-[20px] bg-cyan p-8 text-bg">
        <h3 className="font-display text-2xl font-bold">{t("operate.title")}</h3>
        <p className="mt-3 text-bg/80">{t("operate.text")}</p>
        <ButtonLink href="/contact" className="mt-6 !bg-bg !text-text hover:!bg-panel">
          {t("operate.cta")}
        </ButtonLink>
      </div>
    </div>
  );
}
