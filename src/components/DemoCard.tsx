import { Play, ScanSearch } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDemo } from "@/lib/content";

export type DemoCardData = {
  slug: string;
  title: string;
  short: string;
  cover?: string;
  /** Size of the model download, e.g. "7 MB". */
  size: string;
  /** True when the demo runs on video and webcam, not only on photos. */
  live: boolean;
};

export type DemoCardLabels = { video: string; photo: string; download: string };

/** One demo in a grid: the picture does the explaining, the text names the job. */
export function DemoCard({ d, labels }: { d: DemoCardData; labels: DemoCardLabels }) {
  const Icon = getDemo(d.slug)!.icon;
  return (
    <Link
      href={`/demos/${d.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-panel/60 transition-colors hover:border-line-strong"
    >
      <span className="relative block aspect-[16/9] overflow-hidden bg-panel-2">
        {d.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.cover}
            alt=""
            loading="lazy"
            className="size-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
          />
        ) : (
          <Icon className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-dim" aria-hidden="true" />
        )}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg/80 to-transparent" aria-hidden="true" />
        <span className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-cyan text-bg transition-transform group-hover:scale-110">
            {d.live ? <Play className="size-4 translate-x-px" aria-hidden="true" /> : <ScanSearch className="size-4" aria-hidden="true" />}
          </span>
          <span className="rounded-md bg-bg/80 px-2 py-1 text-xs font-medium text-text">{d.live ? labels.video : labels.photo}</span>
        </span>
      </span>
      <span className="flex flex-1 flex-col p-5">
        <span className="font-display text-lg font-bold">{d.title}</span>
        <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{d.short}</span>
        <span className="mt-4 text-xs text-dim">{labels.download.replace("{size}", d.size)}</span>
      </span>
    </Link>
  );
}
